import express from 'express';

export default (pool) => {
  const router = express.Router();

  router.get('/:userId/friends', async (req, res) => {
    const { userId } = req.params;
    try {
      const { rows } = await pool.query(
        `SELECT u.id, u.username, s.streak FROM friendships f
         JOIN users u ON u.id = f.friend_id
         LEFT JOIN user_stats s ON s.user_id = u.id
         WHERE f.user_id=$1
         UNION
         SELECT u2.id, u2.username, s2.streak FROM friendships f2
         JOIN users u2 ON u2.id = f2.user_id
         LEFT JOIN user_stats s2 ON s2.user_id = u2.id
         WHERE f2.friend_id=$1`,
        [userId]
      );
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load friends' });
    }
  });

  router.post('/:userId/friends', async (req, res) => {
    const { userId } = req.params;
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });
    try {
      const { rows } = await pool.query('SELECT id FROM users WHERE username=$1', [username]);
      if (!rows.length) return res.status(404).json({ error: 'User not found' });
      const friendId = rows[0].id;
      const a = Math.min(Number(userId), Number(friendId));
      const b = Math.max(Number(userId), Number(friendId));
      await pool.query('INSERT INTO friendships (user_id, friend_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [a, b]);
      res.json({ status: 'ok', friendId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add friend' });
    }
  });

  router.delete('/:userId/friends/:friendId', async (req, res) => {
    const { userId, friendId } = req.params;
    try {
      let targetId = friendId;
      if (Number.isNaN(Number(friendId))) {
        const { rows } = await pool.query('SELECT id FROM users WHERE username=$1', [friendId]);
        if (!rows.length) return res.status(404).json({ error: 'Friend not found' });
        targetId = rows[0].id;
      }
      const a = Math.min(Number(userId), Number(targetId));
      const b = Math.max(Number(userId), Number(targetId));
      await pool.query('DELETE FROM friendships WHERE user_id=$1 AND friend_id=$2', [a, b]);
      res.json({ status: 'removed' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to remove friend' });
    }
  });

  return router;
};
