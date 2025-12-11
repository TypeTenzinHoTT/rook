import express from 'express';
import { craftItem, getCraftingRecipes } from '../lib/crafting.js';

const router = express.Router();

router.post('/:userId/craft/:recipeCode', async (req, res) => {
  const { userId, recipeCode } = req.params;
  const pool = req.app.get('pool');
  const io = req.app.get('io');
  try {
    const userRow = await pool.query('SELECT username FROM users WHERE id=$1', [userId]);
    const result = await craftItem(pool, userId, recipeCode);
    if (result.success) {
      io?.emit('craft', {
        userId,
        crafted: result.crafted,
        itemIcon: result.itemIcon,
        newQuantity: result.newQuantity,
        username: userRow.rows[0]?.username
      });
      return res.json({
        success: true,
        crafted: result.crafted,
        icon: result.itemIcon,
        quantity: result.newQuantity,
        bonusQuantity: result.bonusQuantity,
        upgraded: result.upgraded,
        craftingLevel: result.craftingLevel,
        craftingXp: result.craftingXp
      });
    }
    return res.status(400).json({ error: result.error || 'Crafting failed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Crafting failed' });
  }
});

router.get('/recipes', async (req, res) => {
  const pool = req.app.get('pool');
  try {
    const recipes = await getCraftingRecipes(pool);
    res.json(recipes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load recipes' });
  }
});

export default router;
