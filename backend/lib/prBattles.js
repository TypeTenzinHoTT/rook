import { applyXpWithBonuses } from './xpEvents.js';
import { notifyPrBattleWin } from './notifications.js';

async function buildBattlePayload(pool, battleId, perspectiveUserId) {
  const { rows } = await pool.query(
    `SELECT pb.id, pb.status, pb.winner_user_id, pb.created_at,
            p.user_id as you_id, p.pr_number as you_pr, p.reviewed_at as you_reviewed,
            opp.user_id as opp_id, opp.pr_number as opp_pr, opp.reviewed_at as opp_reviewed,
            u.username as you_name, u2.username as opp_name
     FROM pr_battle_participants p
     JOIN pr_battles pb ON pb.id = p.battle_id
     LEFT JOIN pr_battle_participants opp ON opp.battle_id = pb.id AND opp.user_id <> p.user_id
     LEFT JOIN users u ON u.id = p.user_id
     LEFT JOIN users u2 ON u2.id = opp.user_id
     WHERE p.battle_id=$1 AND p.user_id=$2
     LIMIT 1`,
    [battleId, perspectiveUserId]
  );
  const row = rows[0];
  if (!row) return null;
  let status = row.status;
  if (row.status === 'completed') {
    status = row.winner_user_id === row.you_id ? 'won' : 'lost';
  } else if (row.status === 'active') {
    status = 'you are WINNING (review pending)';
  } else if (row.status === 'pending') {
    status = 'waiting for challenger';
  }
  return {
    opponent: row.opp_name || 'TBD',
    status,
    you: { prNumber: row.you_pr, reviewed: Boolean(row.you_reviewed) },
    them: { prNumber: row.opp_pr, reviewed: Boolean(row.opp_reviewed) },
    battleId
  };
}

export async function handlePrOpened(pool, { userId, prId, prNumber, repo, url, io }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: pending } = await client.query(
      `SELECT pb.id
       FROM pr_battles pb
       JOIN pr_battle_participants p ON p.battle_id = pb.id
       WHERE pb.status='pending' AND pb.created_at >= NOW() - INTERVAL '10 minutes' AND p.user_id <> $1
       ORDER BY pb.created_at ASC
       LIMIT 1`,
      [userId]
    );
    let battleId;
    if (pending.length) {
      battleId = pending[0].id;
      await client.query('UPDATE pr_battles SET status=$1, started_at=NOW() WHERE id=$2', ['active', battleId]);
    } else {
      const insert = await client.query('INSERT INTO pr_battles (status, repo) VALUES ($1,$2) RETURNING id', ['pending', repo || null]);
      battleId = insert.rows[0].id;
    }
    await client.query(
      `INSERT INTO pr_battle_participants (battle_id, user_id, pr_id, pr_number, pr_url)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (battle_id, user_id) DO NOTHING`,
      [battleId, userId, prId, prNumber || null, url || null]
    );
    await client.query('COMMIT');
    const payload = await buildBattlePayload(pool, battleId, userId);
    if (payload) io?.emit('battle:update', payload);
    return payload;
  } catch (err) {
    await client.query('ROLLBACK');
    return null;
  } finally {
    client.release();
  }
}

export async function handlePrReviewed(pool, { prId, io }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT pb.id, pb.status, pb.winner_user_id, p.user_id, p.pr_number
       FROM pr_battle_participants p
       JOIN pr_battles pb ON pb.id = p.battle_id
       WHERE p.pr_id=$1
       ORDER BY pb.created_at DESC
       LIMIT 1`,
      [prId]
    );
    const battle = rows[0];
    if (!battle) {
      await client.query('ROLLBACK');
      return null;
    }
    if (battle.status === 'completed' || battle.winner_user_id) {
      await client.query('ROLLBACK');
      return null;
    }
    const { rows: oppRows } = await client.query(
      'SELECT user_id FROM pr_battle_participants WHERE battle_id=$1 AND user_id <> $2 LIMIT 1',
      [battle.id, battle.user_id]
    );
    const opponentId = oppRows[0]?.user_id;
    await client.query('UPDATE pr_battles SET status=$1, winner_user_id=$2, ended_at=NOW() WHERE id=$3', ['completed', battle.user_id, battle.id]);
    await client.query('UPDATE pr_battle_participants SET reviewed_at=NOW() WHERE battle_id=$1 AND user_id=$2', [battle.id, battle.user_id]);
    await client.query('COMMIT');

    const winner = battle.user_id;
    if (winner) {
      await applyXpWithBonuses(pool, { userId: winner, amount: 150, reason: 'PR Battle win', activityType: 'pr_battle', io, context: { battleId: battle.id } });
    }
    if (opponentId) {
      await applyXpWithBonuses(pool, { userId: opponentId, amount: 50, reason: 'PR Battle loss', activityType: 'pr_battle', io, context: { battleId: battle.id } });
    }
    const payload = await buildBattlePayload(pool, battle.id, winner);
    io?.emit('battle:win', { battleId: battle.id, winner, opponent: opponentId });
    if (winner) {
      await notifyPrBattleWin(pool, { userId: winner, opponentId, battleId: battle.id });
    }
    return payload;
  } catch (err) {
    await client.query('ROLLBACK');
    return null;
  } finally {
    client.release();
  }
}

export async function listUserBattles(pool, userId) {
  const { rows } = await pool.query(
    `SELECT pb.id
     FROM pr_battle_participants p
     JOIN pr_battles pb ON pb.id = p.battle_id
     WHERE p.user_id=$1
       AND pb.status IN ('pending','active','completed')
     ORDER BY pb.created_at DESC
     LIMIT 10`,
    [userId]
  );
  const battles = [];
  for (const row of rows) {
    const payload = await buildBattlePayload(pool, row.id, userId);
    if (payload) battles.push(payload);
  }
  return battles;
}
