import express from 'express';
import { calculateLevel, ensureUserStats } from '../lib/progression.js';
import { completeMaintainQuest, updateWeeklyXpQuest } from '../lib/quests.js';
import { generateCoachTip } from '../lib/coach.js';
import { getCraftingRecipes } from '../lib/crafting.js';
import { applyXpWithBonuses } from '../lib/xpEvents.js';
import { getQuestStreak } from '../lib/questStreak.js';
import { listUserBattles } from '../lib/prBattles.js';
import { getCraftingSkill, formatCraftingPerks } from '../lib/craftingSkill.js';
import { getGuildSummary } from '../lib/guilds.js';
import { getPrestigeSummary, performPrestige } from '../lib/prestige.js';

export default (pool) => {
  const router = express.Router();

  router.post('/register', async (req, res) => {
    const { githubId, username, token } = req.body;
    if (!githubId || !username) return res.status(400).json({ error: 'githubId and username required' });
    try {
      const existing = await pool.query('SELECT id FROM users WHERE github_id=$1', [githubId]);
      let userId;
      if (existing.rows.length) {
        userId = existing.rows[0].id;
        await pool.query('UPDATE users SET username=$1, github_token=$2 WHERE id=$3', [username, token || null, userId]);
      } else {
        const insert = await pool.query('INSERT INTO users (github_id, username, github_token) VALUES ($1,$2,$3) RETURNING id', [githubId, username, token || null]);
        userId = insert.rows[0].id;
      }
      await ensureUserStats(pool, userId);
      res.json({ userId, username });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to register user' });
    }
  });

  router.get('/:userId/stats', async (req, res) => {
    const { userId } = req.params;
    try {
      const baseRes = await pool.query(
        `SELECT u.id as user_id, u.username, s.total_xp, s.streak, s.last_active,
                s.quest_streak, s.last_quest_completed, s.crafting_xp, s.crafting_level, s.luck_meter, s.guild_id
         FROM users u JOIN user_stats s ON u.id = s.user_id WHERE u.id=$1`,
        [userId]
      );
      if (!baseRes.rows.length) return res.status(404).json({ error: 'User not found' });
      const row = baseRes.rows[0];
      const { rows: achievementsRows } = await pool.query(
        `SELECT a.id, a.code, a.name, a.description, a.icon, a.rarity, ua.unlocked_at
         FROM user_achievements ua
         JOIN achievements a ON a.id = ua.achievement_id
         WHERE ua.user_id=$1
         ORDER BY ua.unlocked_at DESC`,
        [userId]
      );
      const { rows: recentActivity } = await pool.query('SELECT amount, reason, activity_type, created_at FROM xp_activity WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5', [
        userId
      ]);
      const { rows: recentLoot } = await pool.query(
        `SELECT li.id as item_id, li.code, li.name, li.ascii_icon, li.rarity, ld.quantity, ld.created_at
         FROM loot_drops ld
         JOIN loot_items li ON li.id = ld.item_id
         WHERE ld.user_id=$1
         ORDER BY ld.created_at DESC
         LIMIT 5`,
        [userId]
      );
      const coachTip = await generateCoachTip({ pool, userId, username: row.username });
      const craftingRecipes = await getCraftingRecipes(pool);
      const level = calculateLevel(row.total_xp || 0);
      const questStreakData = await getQuestStreak(pool, userId);
      const prBattles = await listUserBattles(pool, userId);
      const craftingSkill = await getCraftingSkill(pool, userId);
      const guild = await getGuildSummary(pool, userId);
      const prestige = await getPrestigeSummary(pool, userId);
      res.json({
        userId: row.user_id,
        username: row.username,
        level,
        currentXp: row.total_xp,
        totalXp: row.total_xp,
        streak: row.streak,
        lastActive: row.last_active,
        questStreak: questStreakData.questStreak,
        questStreakBonus: questStreakData.questStreakBonus,
        achievements: achievementsRows.map((a) => ({
          id: a.code || String(a.id),
          name: a.name,
          description: a.description,
          icon: a.icon,
          rarity: a.rarity,
          unlockedAt: a.unlocked_at
        })),
        coachTip,
        recentActivity,
        recentLoot: recentLoot.map((l) => ({
          itemId: l.item_id,
          code: l.code,
          name: l.name,
          icon: l.ascii_icon,
          rarity: l.rarity,
          quantity: l.quantity,
          createdAt: l.created_at
        })),
        craftingRecipes,
        crafting: {
          level: craftingSkill.level,
          xp: craftingSkill.xp,
          perks: formatCraftingPerks(craftingSkill.perks)
        },
        luckMeter: row.luck_meter || 0,
        prBattles,
        guild,
        prestige
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  router.post('/:userId/xp', async (req, res) => {
    const { userId } = req.params;
    const { amount = 0, reason = 'activity' } = req.body;
    try {
      const io = req.app.get('io');
      const result = await applyXpWithBonuses(pool, {
        userId,
        amount,
        reason,
        activityType: 'manual',
        io
      });
      await updateWeeklyXpQuest(pool, { userId, increment: result.appliedXp || amount, io });
      await completeMaintainQuest(pool, { userId, streak: result.streak, io });
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to award XP' });
    }
  });

  router.get('/:userId/activity', async (req, res) => {
    const { userId } = req.params;
    const limit = Number(req.query.limit || 10);
    try {
      const { rows } = await pool.query('SELECT * FROM xp_activity WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch activity' });
    }
  });

  router.get('/:userId/loot', async (req, res) => {
    const { userId } = req.params;
    try {
      const { rows } = await pool.query(
        `SELECT li.id as item_id, li.code, li.name, li.ascii_icon, li.rarity, ld.quantity
         FROM loot_drops ld
         JOIN loot_items li ON li.id = ld.item_id
         WHERE ld.user_id=$1
         ORDER BY li.rarity DESC, li.name ASC`,
        [userId]
      );
      const inventory = rows.map((l) => ({
        itemId: l.item_id,
        code: l.code,
        name: l.name,
        icon: l.ascii_icon,
        rarity: l.rarity,
        quantity: l.quantity
      }));
      res.json({ inventory });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch loot' });
    }
  });

  // alias endpoint for history
  router.get('/:userId/xp', async (req, res) => {
    const { userId } = req.params;
    const limit = Number(req.query.limit || 20);
    try {
      const { rows } = await pool.query('SELECT amount, reason, activity_type, created_at FROM xp_activity WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2', [
        userId,
        limit
      ]);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch xp history' });
    }
  });

  router.post('/:userId/achievements/:achievementId/share', async (req, res) => {
    const { userId, achievementId } = req.params;
    const { platform = 'link' } = req.body || {};
    const url = `https://rook.gg/share/${userId}/${achievementId}?platform=${platform}`;
    res.json({ url });
  });

  router.post('/:userId/prestige', async (req, res) => {
    const { userId } = req.params;
    const { level } = req.body || {};
    try {
      const result = await performPrestige(pool, { userId, level });
      if (result.error) return res.status(400).json({ error: result.error });
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to prestige' });
    }
  });

  return router;
};
