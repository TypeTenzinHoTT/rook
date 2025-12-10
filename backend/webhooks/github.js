import express from 'express';
import crypto from 'crypto';

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

  async function awardXp(userId, amount, reason, activityType, io) {
    await pool.query('UPDATE user_stats SET total_xp = total_xp + $1 WHERE user_id=$2', [amount, userId]);
    await pool.query('INSERT INTO xp_activity (user_id, amount, reason, activity_type) VALUES ($1,$2,$3,$4)', [userId, amount, reason, activityType]);
    io?.emit('leaderboard:update', { userId, delta: amount });
  }

  async function findUserIdByGitHubId(githubId) {
    const { rows } = await pool.query('SELECT id FROM users WHERE github_id=$1', [String(githubId)]);
    return rows[0]?.id;
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
        const commitCount = payload.commits?.length || 0;
        const xp = commitCount * XP.COMMIT;
        if (xp) await awardXp(userId, xp, 'GitHub commits', 'commit', io);
      } else if (event === 'pull_request') {
        if (payload.action === 'opened') await awardXp(userId, XP.PR_CREATED, 'Opened PR', 'pr', io);
        if (payload.action === 'closed' && payload.pull_request?.merged) await awardXp(userId, XP.PR_MERGED, 'Merged PR', 'pr', io);
      } else if (event === 'issues') {
        if (payload.action === 'opened') await awardXp(userId, XP.ISSUE_CREATED, 'Opened issue', 'issue', io);
        if (payload.action === 'closed') await awardXp(userId, XP.ISSUE_CLOSED, 'Closed issue', 'issue', io);
      } else if (event === 'pull_request_review') {
        if (payload.action === 'submitted') await awardXp(userId, XP.PR_REVIEWED, 'Reviewed PR', 'review', io);
      }
      res.json({ status: 'ok' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'webhook failed' });
    }
  });

  return router;
};
