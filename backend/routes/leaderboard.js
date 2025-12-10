import express from 'express';

function calculateLevel(totalXp) {
  return Math.floor(Math.sqrt(totalXp / 1000)) + 1;
}

export default (pool) => {
  const router = express.Router();

  router.get('/leaderboard/global', async (req, res) => {
    const limit = Number(req.query.limit || 10);
    const page = Number(req.query.page || 1);
    const offset = (page - 1) * limit;
    try {
      const { rows } = await pool.query(
        'SELECT u.username, s.total_xp, s.streak, s.achievements FROM user_stats s JOIN users u ON u.id = s.user_id ORDER BY s.total_xp DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      const payload = rows.map((row, idx) => ({
        rank: offset + idx + 1,
        username: row.username,
        totalXp: row.total_xp,
        achievements: Array.isArray(row.achievements) ? row.achievements.length : 0,
        level: calculateLevel(row.total_xp),
        streak: row.streak || 0
      }));
      res.json(payload);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  router.get('/users/:userId/leaderboard/friends', async (req, res) => {
    const { userId } = req.params;
    try {
      const { rows: friendRows } = await pool.query('SELECT friend_id FROM friendships WHERE user_id=$1 UNION SELECT user_id FROM friendships WHERE friend_id=$1', [userId]);
      const ids = friendRows.map((r) => r.friend_id || r.user_id);
      ids.push(Number(userId));
      if (!ids.length) return res.json([]);
      const { rows } = await pool.query(
        `SELECT u.username, s.total_xp, s.streak, s.achievements FROM user_stats s
         JOIN users u ON u.id = s.user_id
         WHERE s.user_id = ANY($1)
         ORDER BY s.total_xp DESC`,
        [ids]
      );
      const payload = rows.map((row, idx) => ({
        rank: idx + 1,
        username: row.username,
        totalXp: row.total_xp,
        achievements: Array.isArray(row.achievements) ? row.achievements.length : 0,
        level: calculateLevel(row.total_xp),
        streak: row.streak || 0
      }));
      res.json(payload);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch friends leaderboard' });
    }
  });

  return router;
};
