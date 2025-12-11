import fetch from 'node-fetch';

async function getIntegrations(pool, userId) {
  const { rows } = await pool.query('SELECT type, webhook_url FROM notification_integrations WHERE user_id=$1', [userId]);
  return rows || [];
}

async function sendWebhook(url, type, message) {
  try {
    const payload = type === 'slack' ? { text: message } : { content: message };
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('Failed to dispatch notification', err);
  }
}

export async function upsertIntegration(pool, { userId, type, webhookUrl }) {
  await pool.query(
    `INSERT INTO notification_integrations (user_id, type, webhook_url)
     VALUES ($1,$2,$3)
     ON CONFLICT (user_id, type) DO UPDATE SET webhook_url = EXCLUDED.webhook_url`,
    [userId, type, webhookUrl]
  );
  return getIntegrations(pool, userId);
}

export async function removeIntegration(pool, { userId, type }) {
  await pool.query('DELETE FROM notification_integrations WHERE user_id=$1 AND type=$2', [userId, type]);
  return getIntegrations(pool, userId);
}

export async function listIntegrations(pool, userId) {
  return getIntegrations(pool, userId);
}

export async function notifyLevelUp(pool, { userId, level, reason }) {
  const integrations = await getIntegrations(pool, userId);
  if (!integrations.length) return;
  const { rows } = await pool.query('SELECT username FROM users WHERE id=$1', [userId]);
  const username = rows[0]?.username || `User ${userId}`;
  const message = `🏆 ${username} reached level ${level}! (${reason || 'XP milestone'})`;
  await Promise.all(integrations.map((i) => sendWebhook(i.webhook_url, i.type, message)));
}

export async function notifyCraftingLegendary(pool, { userId, itemName }) {
  const integrations = await getIntegrations(pool, userId);
  if (!integrations.length) return;
  const { rows } = await pool.query('SELECT username FROM users WHERE id=$1', [userId]);
  const username = rows[0]?.username || `User ${userId}`;
  const message = `🛠️ ${username} crafted a legendary item: ${itemName}`;
  await Promise.all(integrations.map((i) => sendWebhook(i.webhook_url, i.type, message)));
}

export async function notifyPrBattleWin(pool, { userId, opponentId, battleId }) {
  const integrations = await getIntegrations(pool, userId);
  if (!integrations.length) return;
  const { rows } = await pool.query('SELECT username FROM users WHERE id=ANY($1)', [[userId, opponentId].filter(Boolean)]);
  const userMap = new Map(rows.map((r) => [r.id, r.username]));
  const name = userMap.get(userId) || `User ${userId}`;
  const opp = opponentId ? userMap.get(opponentId) || `User ${opponentId}` : 'unknown rival';
  const message = `⚔️ ${name} won a PR Battle against ${opp}! (Battle #${battleId})`;
  await Promise.all(integrations.map((i) => sendWebhook(i.webhook_url, i.type, message)));
}

export async function notifyWeeklyBoss(pool, { userId }) {
  const integrations = await getIntegrations(pool, userId);
  if (!integrations.length) return;
  const { rows } = await pool.query('SELECT username FROM users WHERE id=$1', [userId]);
  const username = rows[0]?.username || `User ${userId}`;
  const message = `🏰 ${username} cleared all weekly bosses!`;
  await Promise.all(integrations.map((i) => sendWebhook(i.webhook_url, i.type, message)));
}
