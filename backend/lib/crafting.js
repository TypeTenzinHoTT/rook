import { ensureUserStats } from './progression.js';
import { getCraftingSkill, addCraftingXp } from './craftingSkill.js';
import { getPrestigeSummary, getPrestigeCraftingDiscount } from './prestige.js';
import { notifyCraftingLegendary } from './notifications.js';

const RECIPES = [
  {
    code: 'iron_blade',
    name: 'Iron Blade',
    description: 'A sturdy blade forged from wood and bricks.',
    resultCode: 'review_crystal',
    ingredients: [
      { code: 'wood_log', qty: 3 },
      { code: 'merge_brick', qty: 1 }
    ]
  },
  {
    code: 'wisdom_orb',
    name: 'Wisdom Orb',
    description: 'Channels review insights into debugging power.',
    resultCode: 'bugfix_shard',
    ingredients: [
      { code: 'review_crystal', qty: 2 },
      { code: 'wood_log', qty: 1 }
    ]
  },
  {
    code: 'phoenix_core',
    name: 'Phoenix Core',
    description: 'The ultimate crafting achievement.',
    resultCode: 'golden_flame',
    ingredients: [
      { code: 'golden_flame', qty: 1 },
      { code: 'bugfix_shard', qty: 2 }
    ]
  }
];

async function getItemIds(pool, codes) {
  const { rows } = await pool.query('SELECT id, code, name, ascii_icon FROM loot_items WHERE code = ANY($1)', [codes]);
  const map = new Map(rows.map((r) => [r.code, r]));
  return map;
}

export async function seedCraftingRecipes(pool) {
  const itemMap = await getItemIds(pool, RECIPES.flatMap((r) => [r.resultCode, ...r.ingredients.map((i) => i.code)]));
  for (const recipe of RECIPES) {
    const result = itemMap.get(recipe.resultCode);
    if (!result) continue;
    const insert = await pool.query(
      `INSERT INTO crafting_recipes (code, name, description, result_item_id)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (code) DO NOTHING
       RETURNING id`,
      [recipe.code, recipe.name, recipe.description, result.id]
    );
    const recipeId = insert.rows[0]?.id;
    if (!recipeId) {
      // Fetch existing id to ensure ingredients exist
      const existing = await pool.query('SELECT id FROM crafting_recipes WHERE code=$1', [recipe.code]);
      if (!existing.rows.length) continue;
      for (const ing of recipe.ingredients) {
        const item = itemMap.get(ing.code);
        if (!item) continue;
        await pool.query(
          `INSERT INTO crafting_recipe_ingredients (recipe_id, item_id, quantity)
           VALUES ($1,$2,$3)
           ON CONFLICT (recipe_id, item_id) DO NOTHING`,
          [existing.rows[0].id, item.id, ing.qty]
        );
      }
      continue;
    }
    for (const ing of recipe.ingredients) {
      const item = itemMap.get(ing.code);
      if (!item) continue;
      await pool.query(
        `INSERT INTO crafting_recipe_ingredients (recipe_id, item_id, quantity)
         VALUES ($1,$2,$3)
         ON CONFLICT (recipe_id, item_id) DO NOTHING`,
        [recipeId, item.id, ing.qty]
      );
    }
  }
}

export async function getCraftingRecipes(pool) {
  const { rows: recipes } = await pool.query(
    `SELECT cr.id, cr.code, cr.name, cr.description, li.id as result_item_id, li.code as result_code, li.name as result_name, li.ascii_icon as result_icon
     FROM crafting_recipes cr
     JOIN loot_items li ON li.id = cr.result_item_id`
  );
  if (!recipes.length) return [];
  const recipeIds = recipes.map((r) => r.id);
  const { rows: ingredients } = await pool.query(
    `SELECT cri.recipe_id, li.id as item_id, li.code, li.name, li.ascii_icon, cri.quantity
     FROM crafting_recipe_ingredients cri
     JOIN loot_items li ON li.id = cri.item_id
     WHERE cri.recipe_id = ANY($1)`,
    [recipeIds]
  );
  const ingredientMap = ingredients.reduce((acc, ing) => {
    acc[ing.recipe_id] = acc[ing.recipe_id] || [];
    acc[ing.recipe_id].push({ itemId: ing.item_id, code: ing.code, name: ing.name, qty: ing.quantity, icon: ing.ascii_icon });
    return acc;
  }, {});
  return recipes.map((r) => ({
    code: r.code,
    name: r.name,
    description: r.description,
    ingredients: ingredientMap[r.id] || [],
    result: { itemId: r.result_item_id, code: r.result_code, name: r.result_name, icon: r.result_icon }
  }));
}

export async function craftItem(pool, userId, recipeCode) {
  await ensureUserStats(pool, userId);
  const prestige = await getPrestigeSummary(pool, userId);
  const prestigeDiscount = getPrestigeCraftingDiscount(prestige?.perks);
  const skill = await getCraftingSkill(pool, userId, prestigeDiscount);
  const perks = skill.perks;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const recipeRes = await client.query(
      `SELECT cr.id, cr.name, cr.code, li.id as result_item_id, li.ascii_icon, li.rarity as result_rarity
       FROM crafting_recipes cr
       JOIN loot_items li ON li.id = cr.result_item_id
       WHERE cr.code=$1`,
      [recipeCode]
    );
    if (!recipeRes.rows.length) {
      await client.query('ROLLBACK');
      return { error: 'Recipe not found' };
    }
    const recipe = recipeRes.rows[0];
    const ingRes = await client.query(
      `SELECT cri.item_id, cri.quantity, li.code, li.name
       FROM crafting_recipe_ingredients cri
       JOIN loot_items li ON li.id = cri.item_id
       WHERE cri.recipe_id=$1`,
      [recipe.id]
    );
    const { rows: inventoryRows } = await client.query('SELECT item_id, quantity FROM loot_drops WHERE user_id=$1', [userId]);
    const invMap = new Map(inventoryRows.map((r) => [r.item_id, r.quantity]));

    for (const ing of ingRes.rows) {
      const have = invMap.get(ing.item_id) || 0;
      const needed = Math.max(1, Math.ceil(ing.quantity * (1 - (perks.discount || 0))));
      if (have < needed) {
        await client.query('ROLLBACK');
        return { error: `Not enough ${ing.code} (need ${needed}, have ${have})` };
      }
    }

    for (const ing of ingRes.rows) {
      const needed = Math.max(1, Math.ceil(ing.quantity * (1 - (perks.discount || 0))));
      const remaining = (invMap.get(ing.item_id) || 0) - needed;
      if (remaining > 0) {
        await client.query('UPDATE loot_drops SET quantity=$1 WHERE user_id=$2 AND item_id=$3', [remaining, userId, ing.item_id]);
      } else {
        await client.query('DELETE FROM loot_drops WHERE user_id=$1 AND item_id=$2', [userId, ing.item_id]);
      }
    }

    const upsert = await client.query(
      `INSERT INTO loot_drops (user_id, item_id, quantity) VALUES ($1,$2,1)
       ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = loot_drops.quantity + 1
       RETURNING quantity`,
      [userId, recipe.result_item_id]
    );

    let bonusQuantity = 0;
    if (perks.duplicateChance && Math.random() < perks.duplicateChance) {
      const dup = await client.query(
        `UPDATE loot_drops SET quantity = quantity + 1 WHERE user_id=$1 AND item_id=$2 RETURNING quantity`,
        [userId, recipe.result_item_id]
      );
      bonusQuantity = 1;
      if (!dup.rows.length) {
        await client.query(
          `INSERT INTO loot_drops (user_id, item_id, quantity) VALUES ($1,$2,1)
           ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = loot_drops.quantity + 1`,
          [userId, recipe.result_item_id]
        );
      }
    }

    let upgraded = null;
    if (perks.upgradeChance && Math.random() < perks.upgradeChance) {
      const rarityOrder = ['common', 'rare', 'epic', 'legendary'];
      const currentIdx = rarityOrder.indexOf(recipe.result_rarity || 'common');
      const targetRarity = rarityOrder[Math.min(rarityOrder.length - 1, currentIdx + 1)];
      const { rows: upgradeItem } = await client.query(
        'SELECT id, name, ascii_icon, rarity FROM loot_items WHERE rarity=$1 ORDER BY drop_weight DESC LIMIT 1',
        [targetRarity]
      );
      if (upgradeItem.length) {
        await client.query(
          `INSERT INTO loot_drops (user_id, item_id, quantity)
           VALUES ($1,$2,1)
           ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = loot_drops.quantity + 1`,
          [userId, upgradeItem[0].id]
        );
        upgraded = upgradeItem[0];
      }
    }

    await client.query('COMMIT');
    const craftingProgress = await addCraftingXp(pool, userId, 10, prestigeDiscount);
    if (recipe.result_rarity === 'legendary' || upgraded?.rarity === 'legendary') {
      await notifyCraftingLegendary(pool, { userId, itemName: recipe.name });
    }
    return {
      success: true,
      crafted: recipe.name,
      itemIcon: recipe.ascii_icon,
      newQuantity: upsert.rows[0]?.quantity || 1,
      bonusQuantity,
      upgraded,
      craftingLevel: craftingProgress.level,
      craftingXp: craftingProgress.xp
    };
  } catch (err) {
    await client.query('ROLLBACK');
    return { error: 'Crafting failed' };
  } finally {
    client.release();
  }
}
