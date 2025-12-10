import express from 'express';

function calculateLevel(totalXp) {
  return Math.floor(Math.sqrt(totalXp / 1000)) + 1;
}

function calculateStreak(lastActive, currentStreak) {
  const last = new Date(lastActive || new Date());
  const today = new Date();
  const startToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const startLast = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
  const diffDays = Math.floor((startToday - startLast) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return currentStreak;
  if (diffDays === 1) return currentStreak + 1;
  return 1;
}

export default (pool) => {
  const router = express.Router();

  async function ensureUserStats(userId) {
    const { rows } = await pool.query('SELECT * FROM user_stats WHERE user_id=$1', [userId]);
    if (!rows.length) {
      await pool.query('INSERT INTO user_stats (user_id) VALUES ($1)', [userId]);
    }
  }

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
      await ensureUserStats(userId);
      res.json({ userId, username });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to register user' });
    }
  });

  router.get('/:userId/stats', async (req, res) => {
    const { userId } = req.params;
    try {
      const { rows } = await pool.query(
        'SELECT u.id as user_id, u.username, s.total_xp, s.streak, s.last_active, s.achievements FROM users u JOIN user_stats s ON u.id = s.user_id WHERE u.id=$1',
        [userId]
      );
      if (!rows.length) return res.status(404).json({ error: 'User not found' });
      const row = rows[0];
      const level = calculateLevel(row.total_xp || 0);
      res.json({
        userId: row.user_id,
        username: row.username,
        level,
        currentXp: row.total_xp,
        totalXp: row.total_xp,
        streak: row.streak,
        lastActive: row.last_active,
        achievements: row.achievements || []
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
      await ensureUserStats(userId);
      const current = await pool.query('SELECT total_xp, streak, last_active FROM user_stats WHERE user_id=$1', [userId]);
      const row = current.rows[0];
      const newTotal = (row.total_xp || 0) + Number(amount);
      const newStreak = calculateStreak(row.last_active, row.streak || 0);
      await pool.query('UPDATE user_stats SET total_xp=$1, streak=$2, last_active=NOW() WHERE user_id=$3', [newTotal, newStreak, userId]);
      await pool.query('INSERT INTO xp_activity (user_id, amount, reason, activity_type) VALUES ($1,$2,$3,$4)', [userId, amount, reason, 'manual']);
      const io = req.app.get('io');
      io?.emit('leaderboard:update', { userId, totalXp: newTotal, delta: amount });
      res.json({ totalXp: newTotal, streak: newStreak, level: calculateLevel(newTotal) });
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

  router.post('/:userId/achievements/:achievementId/share', async (req, res) => {
    const { userId, achievementId } = req.params;
    const { platform = 'link' } = req.body || {};
    const url = `https://rook.gg/share/${userId}/${achievementId}?platform=${platform}`;
    res.json({ url });
  });

  return router;
};
