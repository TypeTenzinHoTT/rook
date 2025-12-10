import express from 'express';

const DAILY_QUESTS = [
  { title: 'Make 3 commits', description: 'Push code to earn XP', xp_reward: 150, progress_total: 3 },
  { title: 'Open 1 PR', description: 'Open a pull request', xp_reward: 100, progress_total: 1 },
  { title: 'Review 2 PRs', description: 'Give feedback to peers', xp_reward: 150, progress_total: 2 },
  { title: 'Close 1 issue', description: 'Close an issue', xp_reward: 100, progress_total: 1 },
  { title: 'Maintain your streak', description: 'Stay active today', xp_reward: 50, progress_total: 1 }
];

const WEEKLY_QUESTS = [
  { title: 'Make 20 commits this week', description: 'Stay consistent', xp_reward: 500, progress_total: 20 },
  { title: 'Merge 3 PRs this week', description: 'Ship features', xp_reward: 600, progress_total: 3 },
  { title: 'Earn 1000 XP this week', description: 'Go big or go home', xp_reward: 1000, progress_total: 1000 }
];

export default (pool) => {
  const router = express.Router();

  async function ensureDaily(userId) {
    const { rows } = await pool.query('SELECT * FROM daily_quests WHERE user_id=$1 AND created_at = CURRENT_DATE AND type=$2', [userId, 'daily']);
    if (rows.length) return rows;
    const inserts = await Promise.all(
      DAILY_QUESTS.map((q) =>
        pool.query(
          'INSERT INTO daily_quests (user_id, title, description, type, xp_reward, progress_total) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
          [userId, q.title, q.description, 'daily', q.xp_reward, q.progress_total]
        )
      )
    );
    return inserts.map((r) => r.rows[0]);
  }

  async function ensureWeekly(userId) {
    const { rows } = await pool.query(
      "SELECT * FROM daily_quests WHERE user_id=$1 AND type='boss' AND created_at >= date_trunc('week', CURRENT_DATE)",
      [userId]
    );
    if (rows.length) return rows;
    const inserts = await Promise.all(
      WEEKLY_QUESTS.map((q) =>
        pool.query(
          'INSERT INTO daily_quests (user_id, title, description, type, xp_reward, progress_total, created_at) VALUES ($1,$2,$3,$4,$5,$6,CURRENT_DATE) RETURNING *',
          [userId, q.title, q.description, 'boss', q.xp_reward, q.progress_total]
        )
      )
    );
    return inserts.map((r) => r.rows[0]);
  }

  router.get('/:userId/quests/daily', async (req, res) => {
    const { userId } = req.params;
    try {
      const quests = await ensureDaily(userId);
      res.json(
        quests.map((q) => ({
          id: q.id,
          title: q.title,
          description: q.description,
          xpReward: q.xp_reward,
          type: q.type,
          completed: q.completed,
          progress: { current: q.progress_current, total: q.progress_total },
          deadline: q.deadline
        }))
      );
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load daily quests' });
    }
  });

  router.get('/:userId/quests/weekly', async (req, res) => {
    const { userId } = req.params;
    try {
      const quests = await ensureWeekly(userId);
      res.json(
        quests.map((q) => ({
          id: q.id,
          title: q.title,
          description: q.description,
          xpReward: q.xp_reward,
          type: 'boss',
          completed: q.completed,
          progress: { current: q.progress_current, total: q.progress_total },
          deadline: q.deadline
        }))
      );
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load weekly quests' });
    }
  });

  router.post('/:userId/quests/:questId/complete', async (req, res) => {
    const { userId, questId } = req.params;
    try {
      const questRes = await pool.query('SELECT * FROM daily_quests WHERE id=$1 AND user_id=$2', [questId, userId]);
      if (!questRes.rows.length) return res.status(404).json({ error: 'Quest not found' });
      const quest = questRes.rows[0];
      if (!quest.completed) {
        await pool.query('UPDATE daily_quests SET completed=true WHERE id=$1', [questId]);
        await pool.query('UPDATE user_stats SET total_xp = total_xp + $1 WHERE user_id=$2', [quest.xp_reward, userId]);
        await pool.query('INSERT INTO xp_activity (user_id, amount, reason, activity_type) VALUES ($1,$2,$3,$4)', [userId, quest.xp_reward, quest.title, 'quest']);
        const io = req.app.get('io');
        io?.emit('leaderboard:update', { userId, delta: quest.xp_reward });
      }
      res.json({ status: 'ok', xpAwarded: quest.xp_reward });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to complete quest' });
    }
  });

  return router;
};
