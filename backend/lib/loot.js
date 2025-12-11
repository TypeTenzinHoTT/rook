let lootTable = [];

const rarityRank = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3
};

export async function loadLootTable(pool) {
  const { rows } = await pool.query('SELECT id, code, name, rarity, drop_weight, description, ascii_icon FROM loot_items');
  lootTable = rows || [];
  return lootTable;
}

async function findItemById(pool, itemId) {
  const existing = lootTable.find((i) => Number(i.id) === Number(itemId));
  if (existing) return existing;
  const { rows } = await pool.query('SELECT id, name, ascii_icon, rarity FROM loot_items WHERE id=$1', [itemId]);
  return rows[0];
}

export function getRandomLoot(options = {}) {
  const { luckMeter = 0, forceRarity, minRarity } = options;
  if (!lootTable.length) return null;
  const minRank = minRarity ? rarityRank[minRarity] ?? -1 : -1;
  const filtered = lootTable
    .map((item) => {
      if (forceRarity && item.rarity !== forceRarity) return null;
      if (minRank >= 0 && (rarityRank[item.rarity] ?? -1) < minRank) return null;
      let weight = item.drop_weight || 0;
      if (['rare', 'epic', 'legendary'].includes(item.rarity) && luckMeter > 0) {
        weight = weight * (1 + luckMeter * 0.005);
      }
      return { item, weight };
    })
    .filter(Boolean);
  const totalWeight = filtered.reduce((sum, entry) => sum + (entry?.weight || 0), 0);
  if (totalWeight <= 0) return null;
  let roll = Math.random() * totalWeight;
  for (const entry of filtered) {
    roll -= entry.weight || 0;
    if (roll <= 0) return entry.item;
  }
  return filtered[filtered.length - 1]?.item || null;
}

export async function awardLoot(pool, { userId, itemId }) {
  const item = await findItemById(pool, itemId);
  const upsert = await pool.query(
    `INSERT INTO loot_drops (user_id, item_id, quantity)
     VALUES ($1, $2, 1)
     ON CONFLICT (user_id, item_id)
     DO UPDATE SET quantity = loot_drops.quantity + 1
     RETURNING quantity`,
    [userId, itemId]
  );
  const quantity = upsert.rows[0]?.quantity || 1;
  await updateLuckMeter(pool, userId, item?.rarity);
  return quantity;
}

async function updateLuckMeter(pool, userId, rarity) {
  if (!userId) return;
  if (rarity && ['rare', 'epic', 'legendary'].includes(rarity)) {
    await pool.query('UPDATE user_stats SET luck_meter=0 WHERE user_id=$1', [userId]);
  } else {
    await pool.query('UPDATE user_stats SET luck_meter = COALESCE(luck_meter,0) + 1 WHERE user_id=$1', [userId]);
  }
}

async function getLuckMeter(pool, userId) {
  const { rows } = await pool.query('SELECT luck_meter FROM user_stats WHERE user_id=$1', [userId]);
  return rows[0]?.luck_meter || 0;
}

export async function awardRandomLoot(pool, userId, io, options = {}) {
  if (!lootTable.length) {
    await loadLootTable(pool);
  }
  const luckMeter = options.luckMeter ?? (await getLuckMeter(pool, userId));
  const item = getRandomLoot({ luckMeter, forceRarity: options.forceRarity, minRarity: options.minRarity });
  if (!item) return null;
  const quantity = await awardLoot(pool, { userId, itemId: item.id });
  await updateLuckMeter(pool, userId, item.rarity);
  const payload = { userId, itemName: item.name, itemIcon: item.ascii_icon, quantity, rarity: item.rarity };
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
