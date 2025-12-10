import express from 'express';
import crypto from 'crypto';
import { applyXp } from '../lib/progression.js';
import { updateQuestProgress, completeMaintainQuest, updateWeeklyXpQuest } from '../lib/quests.js';

const XP = {
  COMMIT: 50,
  COMMIT_LARGE: 100,
  PR_CREATED: 100,
  PR_MERGED: 200,
  PR_REVIEWED: 75,
  ISSUE_CLOSED: 100,
  ISSUE_CREATED: 25
};

export default (pool) => {
  const router = express.Router();

  function verifySignature(req) {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) return true;
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) return false;
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  }

  async function findUserIdByGitHubId(githubId) {
    const { rows } = await pool.query('SELECT id FROM users WHERE github_id=$1', [String(githubId)]);
    return rows[0]?.id;
  }

  async function handleXpAndStreak(userId, amount, reason, activityType, io) {
    const result = await applyXp(pool, { userId, amount, reason, activityType, io });
    await completeMaintainQuest(pool, { userId, streak: result.streak, io });
    if (amount) {
      await updateWeeklyXpQuest(pool, { userId, increment: amount, io });
    }
    return result;
  }

  router.post('/', async (req, res) => {
    if (!verifySignature(req)) return res.status(401).json({ error: 'invalid signature' });
    const event = req.headers['x-github-event'];
    const payload = req.body;
    try {
      const githubId = payload?.sender?.id;
      const userId = githubId ? await findUserIdByGitHubId(githubId) : null;
      const io = req.app.get('io');
      if (!userId) {
        return res.json({ status: 'ignored' });
      }

      if (event === 'push') {
        const commitCount = Array.isArray(payload?.commits) ? payload.commits.length : 0;
        const xp = commitCount * XP.COMMIT;
        if (xp) await handleXpAndStreak(userId, xp, 'GitHub commits', 'commit', io);
        if (commitCount) {
          await updateQuestProgress(pool, { userId, title: 'Make 3 commits', increment: commitCount, type: 'daily', io, trackXpReward: true });
          await updateQuestProgress(pool, { userId, title: 'Make 20 commits this week', increment: commitCount, type: 'weekly', io, trackXpReward: true });
        }
      } else if (event === 'pull_request') {
        const action = payload?.action;
        if (action === 'opened') {
          await handleXpAndStreak(userId, XP.PR_CREATED, 'Opened PR', 'pr', io);
          await updateQuestProgress(pool, { userId, title: 'Open 1 PR', increment: 1, type: 'daily', io, trackXpReward: true });
        }
        if (action === 'closed' && payload?.pull_request?.merged) {
          await handleXpAndStreak(userId, XP.PR_MERGED, 'Merged PR', 'pr', io);
          await updateQuestProgress(pool, { userId, title: 'Merge 3 PRs this week', increment: 1, type: 'weekly', io, trackXpReward: true });
        }
      } else if (event === 'issues') {
        const action = payload?.action;
        if (action === 'opened') {
          await handleXpAndStreak(userId, XP.ISSUE_CREATED, 'Opened issue', 'issue', io);
        }
        if (action === 'closed') {
          await handleXpAndStreak(userId, XP.ISSUE_CLOSED, 'Closed issue', 'issue', io);
          await updateQuestProgress(pool, { userId, title: 'Close 1 issue', increment: 1, type: 'daily', io, trackXpReward: true });
        }
      } else if (event === 'pull_request_review') {
        const action = payload?.action;
        if (action === 'submitted') {
          await handleXpAndStreak(userId, XP.PR_REVIEWED, 'Reviewed PR', 'review', io);
          await updateQuestProgress(pool, { userId, title: 'Review 2 PRs', increment: 1, type: 'daily', io, trackXpReward: true });
        }
      }
      res.json({ status: 'ok' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'webhook failed' });
    }
  });

  return router;
};
