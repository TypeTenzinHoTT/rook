import { ensureUserStats } from './progression.js';

const ACTIVE_WINDOW_DAYS = 3;

export async function createGuild(pool, { name, ownerId }) {
  await ensureUserStats(pool, ownerId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insert = await client.query('INSERT INTO guilds (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id', [name]);
    const guildId = insert.rows[0]?.id;
    if (!guildId) {
      await client.query('ROLLBACK');
      return { error: 'Guild name already taken' };
    }
    await client.query('INSERT INTO guild_members (guild_id, user_id, role) VALUES ($1,$2,$3)', [guildId, ownerId, 'leader']);
    await client.query('UPDATE user_stats SET guild_id=$1 WHERE user_id=$2', [guildId, ownerId]);
    await client.query('COMMIT');
    return { guildId };
  } catch (err) {
    await client.query('ROLLBACK');
    return { error: 'Failed to create guild' };
  } finally {
    client.release();
  }
}

export async function joinGuild(pool, { guildId, name, userId }) {
  await ensureUserStats(pool, userId);
  const target = guildId
    ? { id: guildId }
    : (await pool.query('SELECT id FROM guilds WHERE name=$1 LIMIT 1', [name || ''])).rows[0];
  if (!target?.id) return { error: 'Guild not found' };
  await pool.query(
    `INSERT INTO guild_members (guild_id, user_id, role) VALUES ($1,$2,'member')
     ON CONFLICT (user_id) DO UPDATE SET guild_id = EXCLUDED.guild_id, role='member'`,
    [target.id, userId]
  );
  await pool.query('UPDATE user_stats SET guild_id=$1 WHERE user_id=$2', [target.id, userId]);
  return { guildId: target.id };
}

export async function leaveGuild(pool, { userId }) {
  const { rows } = await pool.query('SELECT guild_id FROM guild_members WHERE user_id=$1', [userId]);
  const guildId = rows[0]?.guild_id;
  await pool.query('DELETE FROM guild_members WHERE user_id=$1', [userId]);
  await pool.query('UPDATE user_stats SET guild_id=NULL WHERE user_id=$1', [userId]);
  return { guildId };
}

export async function inviteToGuild(pool, { guildId, userId, invitedBy }) {
  const targetGuild = guildId || (await pool.query('SELECT guild_id FROM guild_members WHERE user_id=$1', [invitedBy])).rows[0]?.guild_id;
  if (!targetGuild) return { error: 'No guild found for inviter' };
  await pool.query(
    `INSERT INTO guild_invites (guild_id, user_id, invited_by, status)
     VALUES ($1,$2,$3,'pending')
     ON CONFLICT (guild_id, user_id) DO NOTHING`,
    [targetGuild, userId, invitedBy]
  );
  return { guildId: targetGuild, userId };
}

export async function getGuildInfo(pool, guildId) {
  const { rows } = await pool.query('SELECT id, name, created_at FROM guilds WHERE id=$1', [guildId]);
  if (!rows.length) return null;
  const guild = rows[0];
  const { rows: memberRows } = await pool.query(
    `SELECT gm.user_id, gm.role, u.username, s.last_active
     FROM guild_members gm
     JOIN users u ON u.id = gm.user_id
     LEFT JOIN user_stats s ON s.user_id = gm.user_id
     WHERE gm.guild_id=$1`,
    [guildId]
  );
  return { ...guild, members: memberRows };
}

export async function getGuildForUser(pool, userId) {
  const { rows } = await pool.query(
    `SELECT g.id, g.name
     FROM guild_members gm
     JOIN guilds g ON g.id = gm.guild_id
     WHERE gm.user_id=$1
     LIMIT 1`,
    [userId]
  );
  if (!rows.length) return null;
  const info = await getGuildInfo(pool, rows[0].id);
  return info;
}

function calculateActiveBonus(members, excludeUserId) {
  const since = Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const activeCount = (members || []).filter((m) => m.user_id !== excludeUserId && m.last_active && new Date(m.last_active).getTime() >= since).length;
  const bonus = Math.min(0.01 * activeCount, 0.1);
  return { activeCount, bonus, multiplier: 1 + bonus };
}

export async function getGuildXpMultiplier(pool, userId) {
  const guild = await getGuildForUser(pool, userId);
  if (!guild) return 1;
  const { multiplier } = calculateActiveBonus(guild.members, userId);
  return multiplier;
}

export async function getGuildSummary(pool, userId) {
  const guild = await getGuildForUser(pool, userId);
  if (!guild) return null;
  const { activeCount, bonus, multiplier } = calculateActiveBonus(guild.members, userId);
  return {
    name: guild.name,
    members: guild.members?.length || 0,
    active: activeCount,
    bonus,
    multiplier
  };
}

export async function ensureGuildQuests(pool, guildId) {
  const { rows } = await pool.query('SELECT id FROM guild_quests WHERE guild_id=$1 AND refresh_at >= date_trunc(\'week\', NOW())', [guildId]);
  if (rows.length) return rows;
  const quests = [
    { title: 'Ship 5 features', description: 'Collectively merge 5 PRs', xp_reward: 200, progress_total: 5 },
    { title: 'Assist allies', description: 'Complete 3 reviews', xp_reward: 150, progress_total: 3 }
  ];
  const inserts = await Promise.all(
    quests.map((q) =>
      pool.query(
        `INSERT INTO guild_quests (guild_id, title, description, xp_reward, progress_total, progress_current, refresh_at)
         VALUES ($1,$2,$3,$4,$5,0,date_trunc('week', NOW()))
         RETURNING *`,
        [guildId, q.title, q.description, q.xp_reward, q.progress_total]
      )
    )
  );
  return inserts.map((i) => i.rows[0]);
}

export async function getGuildQuests(pool, guildId) {
  await ensureGuildQuests(pool, guildId);
  const { rows } = await pool.query(
    `SELECT id, title, description, xp_reward, progress_current, progress_total, refresh_at
     FROM guild_quests WHERE guild_id=$1 ORDER BY id ASC`,
    [guildId]
  );
  return rows || [];
}
