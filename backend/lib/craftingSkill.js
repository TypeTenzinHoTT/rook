const LEVELS = [
  { level: 2, xp: 100 },
  { level: 3, xp: 250 },
  { level: 4, xp: 500 }
];

function calculateCraftingLevel(xp = 0) {
  let level = 1;
  for (const threshold of LEVELS) {
    if (xp >= threshold.xp) level = threshold.level;
  }
  return level;
}

export function getCraftingPerks(level = 1, prestigeBonus = 0) {
  const perks = {
    duplicateChance: 0,
    discount: prestigeBonus,
    upgradeChance: 0
  };
  if (level >= 2) perks.duplicateChance = 0.1;
  if (level >= 3) perks.discount = perks.discount + 0.2;
  if (level >= 4) perks.upgradeChance = 0.05;
  return perks;
}

export function formatCraftingPerks(perks) {
  const entries = [];
  if (perks.duplicateChance) entries.push(`${Math.round(perks.duplicateChance * 100)}% chance duplicate craft`);
  if (perks.discount) entries.push(`${Math.round(perks.discount * 100)}% ingredient discount`);
  if (perks.upgradeChance) entries.push(`${Math.round(perks.upgradeChance * 100)}% chance to upgrade rarity`);
  return entries;
}

export async function getCraftingSkill(pool, userId, prestigeDiscount = 0) {
  const { rows } = await pool.query('SELECT crafting_xp, crafting_level FROM user_stats WHERE user_id=$1', [userId]);
  const xp = rows[0]?.crafting_xp || 0;
  const level = rows[0]?.crafting_level || calculateCraftingLevel(xp);
  const perks = getCraftingPerks(level, prestigeDiscount);
  return { xp, level, perks };
}

export async function addCraftingXp(pool, userId, xpGained = 0, prestigeDiscount = 0) {
  const { rows } = await pool.query('SELECT crafting_xp FROM user_stats WHERE user_id=$1', [userId]);
  const currentXp = rows[0]?.crafting_xp || 0;
  const newXp = currentXp + xpGained;
  const newLevel = calculateCraftingLevel(newXp);
  await pool.query('UPDATE user_stats SET crafting_xp=$1, crafting_level=$2 WHERE user_id=$3', [newXp, newLevel, userId]);
  const perks = getCraftingPerks(newLevel, prestigeDiscount);
  return { xp: newXp, level: newLevel, perks };
}
