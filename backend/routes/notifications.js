import express from 'express';
import { listIntegrations, upsertIntegration, removeIntegration } from '../lib/notifications.js';

export default (pool) => {
  const router = express.Router();

  router.get('/:userId/integrations', async (req, res) => {
    const { userId } = req.params;
    const integrations = await listIntegrations(pool, userId);
    res.json(integrations);
  });

  router.post('/:userId/integrations', async (req, res) => {
    const { userId } = req.params;
    const { type, webhookUrl } = req.body;
    if (!type || !webhookUrl) return res.status(400).json({ error: 'type and webhookUrl required' });
    const integrations = await upsertIntegration(pool, { userId, type, webhookUrl });
    res.json(integrations);
  });

  router.delete('/:userId/integrations/:type', async (req, res) => {
    const { userId, type } = req.params;
    const integrations = await removeIntegration(pool, { userId, type });
    res.json(integrations);
  });

  return router;
};
