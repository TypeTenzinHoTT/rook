let lootTable = [];

export async function loadLootTable(pool) {
  const { rows } = await pool.query('SELECT id, code, name, rarity, drop_weight, description, ascii_icon FROM loot_items');
  lootTable = rows || [];
  return lootTable;
}

export function getRandomLoot() {
  if (!lootTable.length) return null;
  const totalWeight = lootTable.reduce((sum, item) => sum + (item.drop_weight || 0), 0);
  if (totalWeight <= 0) return null;
  let roll = Math.random() * totalWeight;
  for (const item of lootTable) {
    roll -= item.drop_weight || 0;
    if (roll <= 0) return item;
  }
  return lootTable[lootTable.length - 1];
}

export async function awardLoot(pool, { userId, itemId }) {
  const upsert = await pool.query(
    `INSERT INTO loot_drops (user_id, item_id, quantity)
     VALUES ($1, $2, 1)
     ON CONFLICT (user_id, item_id)
     DO UPDATE SET quantity = loot_drops.quantity + 1
     RETURNING quantity`,
    [userId, itemId]
  );
  const quantity = upsert.rows[0]?.quantity || 1;
  return quantity;
}

export async function awardRandomLoot(pool, userId, io) {
  if (!lootTable.length) {
    await loadLootTable(pool);
  }
  const item = getRandomLoot();
  if (!item) return null;
  const quantity = await awardLoot(pool, { userId, itemId: item.id });
  const payload = { userId, itemName: item.name, itemIcon: item.ascii_icon, quantity };
  io?.emit('loot', payload);
  return payload;
}

const SEED_ITEMS = [
  { code: 'wood_log', name: 'Wood Log', icon: '🪵', rarity: 'common', drop_weight: 60, description: 'Basic crafting material.' },
  { code: 'merge_brick', name: 'Merge Brick', icon: '🧱', rarity: 'rare', drop_weight: 25, description: 'Forged from merged PRs.' },
  { code: 'review_crystal', name: 'Insight Crystal', icon: '🔷', rarity: 'rare', drop_weight: 20, description: 'Gleams with review wisdom.' },
  { code: 'bugfix_shard', name: 'Bugfix Shard', icon: '💎', rarity: 'epic', drop_weight: 10, description: 'A shard from squashed bugs.' },
  { code: 'golden_flame', name: 'Golden Flame', icon: '🔥', rarity: 'legendary', drop_weight: 2, description: 'Burns with eternal shipping energy.' }
];

export async function seedLootItems(pool) {
  for (const item of SEED_ITEMS) {
    await pool.query(
      `INSERT INTO loot_items (code, name, rarity, drop_weight, description, ascii_icon)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (code) DO NOTHING`,
      [item.code, item.name, item.rarity, item.drop_weight, item.description, item.icon]
    );
  }
  await loadLootTable(pool);
}
