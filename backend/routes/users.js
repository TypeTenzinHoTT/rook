import express from 'express';
import { applyXp, calculateLevel, ensureUserStats } from '../lib/progression.js';
import { completeMaintainQuest, updateWeeklyXpQuest } from '../lib/quests.js';
import { generateCoachTip } from '../lib/coach.js';

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
        'SELECT u.id as user_id, u.username, s.total_xp, s.streak, s.last_active FROM users u JOIN user_stats s ON u.id = s.user_id WHERE u.id=$1',
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
      const coachTip = await generateCoachTip({ pool, userId, username: row.username });
      const level = calculateLevel(row.total_xp || 0);
      res.json({
        userId: row.user_id,
        username: row.username,
        level,
        currentXp: row.total_xp,
        totalXp: row.total_xp,
        streak: row.streak,
        lastActive: row.last_active,
        achievements: achievementsRows.map((a) => ({
          id: a.code || String(a.id),
          name: a.name,
          description: a.description,
          icon: a.icon,
          rarity: a.rarity,
          unlockedAt: a.unlocked_at
        })),
        coachTip,
        recentActivity
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
      const result = await applyXp(pool, {
        userId,
        amount,
        reason,
        activityType: 'manual',
        io
      });
      await updateWeeklyXpQuest(pool, { userId, increment: amount, io });
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

  return router;
};
