import express from 'express';
import { Octokit } from 'octokit';

const WEBHOOK_PATH = process.env.WEBHOOK_PUBLIC_URL || 'https://rook-3658.onrender.com/api/webhooks/github';

export default (pool) => {
  const router = express.Router();

  router.post('/github/webhooks', async (req, res) => {
    const { repoFullName, token } = req.body || {};
    if (!repoFullName || !token || typeof repoFullName !== 'string' || typeof token !== 'string') {
      return res.status(400).json({ error: 'repoFullName and token are required' });
    }
    try {
      const [owner, repo] = repoFullName.split('/');
      if (!owner || !repo) return res.status(400).json({ error: 'repoFullName must be owner/repo' });
      const octokit = new Octokit({ auth: token });
      const { data: hooks } = await octokit.rest.repos.listWebhooks({ owner, repo, per_page: 100 });
      const existing = hooks.find((h) => h.config?.url === WEBHOOK_PATH);
      const events = ['push', 'pull_request', 'pull_request_review', 'issues'];
      if (!existing) {
        await octokit.rest.repos.createWebhook({
          owner,
          repo,
          config: {
            url: WEBHOOK_PATH,
            content_type: 'json',
            secret: process.env.GITHUB_WEBHOOK_SECRET || undefined,
            insecure_ssl: '0'
          },
          events,
          active: true
        });
      }
      return res.json({ success: true, repo: repoFullName });
    } catch (err) {
      console.error('[webhook:create] failed', err?.response?.data || err);
      return res.status(500).json({ error: 'Failed to configure webhook' });
    }
  });

  return router;
};
