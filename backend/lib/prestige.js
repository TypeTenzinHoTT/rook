import { calculateLevel } from './progression.js';
import { awardLoot } from './loot.js';

const PER_RESET_PERKS = {
  xpBonus: 0.02,
  rareDaily: 1,
  craftingDiscount: 0.01
};

export async function getPrestigeRecords(pool, userId) {
  const { rows } = await pool.query('SELECT perks FROM prestige_resets WHERE user_id=$1', [userId]);
  return rows || [];
}

export function aggregatePerks(records = []) {
  return records.reduce(
    (acc, row) => {
      const perks = row.perks || {};
      acc.xpBonus += Number(perks.xpBonus || 0);
      acc.rareDaily += Number(perks.rareDaily || 0);
      acc.craftingDiscount += Number(perks.craftingDiscount || 0);
      return acc;
    },
    { xpBonus: 0, rareDaily: 0, craftingDiscount: 0 }
  );
}

export async function getPrestigeSummary(pool, userId) {
  const records = await getPrestigeRecords(pool, userId);
  const perks = aggregatePerks(records);
  return {
    count: records.length,
    perks,
    perkSummary: `+${Math.round(perks.xpBonus * 100)}% XP, +${perks.rareDaily} rares/day, ${Math.round(perks.craftingDiscount * 100)}% crafting discount`
  };
}

export async function performPrestige(pool, { userId, level }) {
  const currentLevel = level || calculateLevel((await pool.query('SELECT total_xp FROM user_stats WHERE user_id=$1', [userId])).rows[0]?.total_xp || 0);
  if (currentLevel < 20) {
    return { error: 'Prestige requires level 20' };
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO prestige_resets (user_id, level_reset_at, perks) VALUES ($1,$2,$3)', [userId, currentLevel, PER_RESET_PERKS]);
    await client.query('UPDATE user_stats SET total_xp=0, streak=0, last_active=NULL, quest_streak=0, last_quest_completed=NULL WHERE user_id=$1', [userId]);
    await client.query('COMMIT');
    return getPrestigeSummary(pool, userId);
  } catch (err) {
    await client.query('ROLLBACK');
    return { error: 'Prestige failed' };
  } finally {
    client.release();
  }
}

export async function getPrestigeXpMultiplier(pool, userId) {
  const records = await getPrestigeRecords(pool, userId);
  const perks = aggregatePerks(records);
  return 1 + (perks.xpBonus || 0);
}

async function prestigeDropCount(pool, userId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS cnt FROM xp_activity WHERE user_id=$1 AND activity_type=$2 AND created_at::date = CURRENT_DATE',
    [userId, 'prestige_rare_bonus']
  );
  return rows[0]?.cnt || 0;
}

export async function maybeGrantPrestigeDrops(pool, { userId, io }) {
  const records = await getPrestigeRecords(pool, userId);
  const perks = aggregatePerks(records);
  if (!perks.rareDaily) return null;
  const existing = await prestigeDropCount(pool, userId);
  const remaining = Math.max(0, perks.rareDaily - existing);
  if (!remaining) return null;
  const { rows } = await pool.query('SELECT id, name, ascii_icon, rarity FROM loot_items WHERE rarity IN (\'rare\', \'epic\', \'legendary\') ORDER BY rarity DESC, drop_weight DESC LIMIT 1');
  const item = rows[0];
  if (!item) return null;
  let payload = null;
  for (let i = 0; i < remaining; i++) {
    await pool.query('INSERT INTO xp_activity (user_id, amount, reason, activity_type) VALUES ($1,0,$2,$3)', [
      userId,
      'Prestige rare bonus',
      'prestige_rare_bonus'
    ]);
    const quantity = await awardLoot(pool, { userId, itemId: item.id });
    payload = { userId, itemName: item.name, itemIcon: item.ascii_icon, quantity, rarity: item.rarity };
    io?.emit('loot', payload);
  }
  return payload;
}

export function getPrestigeCraftingDiscount(perks) {
  return perks?.craftingDiscount || 0;
}
