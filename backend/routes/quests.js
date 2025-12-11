import express from 'express';
import { ensureDailyQuests, ensureWeeklyQuests, completeMaintainQuest, updateWeeklyXpQuest } from '../lib/quests.js';
import { applyXpWithBonuses } from '../lib/xpEvents.js';
import { updateQuestStreak } from '../lib/questStreak.js';
import { notifyWeeklyBoss } from '../lib/notifications.js';

export default (pool) => {
  const router = express.Router();

  router.get('/:userId/quests/daily', async (req, res) => {
    const { userId } = req.params;
    try {
      const quests = await ensureDailyQuests(pool, userId);
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
      const quests = await ensureWeeklyQuests(pool, userId);
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
        const io = req.app.get('io');
        let context = {};
        if (quest.type === 'daily') {
          const { rows } = await pool.query(
            "SELECT COUNT(*) AS remaining FROM daily_quests WHERE user_id=$1 AND type='daily' AND created_at = CURRENT_DATE AND completed=false",
            [userId]
          );
          context = { dailyClearedToday: Number(rows[0]?.remaining || 0) === 0 };
        } else {
          const { rows } = await pool.query(
            "SELECT COUNT(*) AS remaining FROM daily_quests WHERE user_id=$1 AND type IN ('boss','weekly') AND created_at >= date_trunc('week', CURRENT_DATE) AND completed=false",
            [userId]
          );
          context = { weeklyClearedThisWeek: Number(rows[0]?.remaining || 0) === 0 };
        }
        const result = await applyXpWithBonuses(pool, { userId, amount: quest.xp_reward, reason: quest.title, activityType: 'quest', io, context });
        await updateWeeklyXpQuest(pool, { userId, increment: result.appliedXp || quest.xp_reward, io });
        await completeMaintainQuest(pool, { userId, streak: result.streak, io });
        if (quest.type === 'daily' && context.dailyClearedToday) {
          await updateQuestStreak(pool, userId);
        }
        if (quest.type !== 'daily' && context.weeklyClearedThisWeek) {
          await notifyWeeklyBoss(pool, { userId });
        }
      }
      res.json({ status: 'ok', xpAwarded: quest.xp_reward });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to complete quest' });
    }
  });

  return router;
};
