import express from 'express';
import { createGuild, joinGuild, leaveGuild, inviteToGuild, getGuildForUser, getGuildQuests, getGuildSummary, getGuildInfo } from '../lib/guilds.js';

export default (pool) => {
  const router = express.Router();

  router.post('/create', async (req, res) => {
    const { name, userId } = req.body;
    if (!name || !userId) return res.status(400).json({ error: 'name and userId required' });
    try {
      const result = await createGuild(pool, { name, ownerId: userId });
      if (result.error) return res.status(400).json({ error: result.error });
      res.json({ guildId: result.guildId, name });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create guild' });
    }
  });

  router.post('/join', async (req, res) => {
    const { guildId, name, userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    try {
      const result = await joinGuild(pool, { guildId, name, userId });
      if (result.error) return res.status(400).json({ error: result.error });
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to join guild' });
    }
  });

  router.post('/leave', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    try {
      const result = await leaveGuild(pool, { userId });
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to leave guild' });
    }
  });

  router.post('/invite', async (req, res) => {
    const { userId, targetUserId, targetUsername } = req.body;
    if (!userId || (!targetUserId && !targetUsername)) return res.status(400).json({ error: 'userId and target required' });
    try {
      let resolvedTarget = targetUserId;
      if (!resolvedTarget && targetUsername) {
        const { rows } = await pool.query('SELECT id FROM users WHERE username=$1', [targetUsername]);
        resolvedTarget = rows[0]?.id;
      }
      if (!resolvedTarget) return res.status(404).json({ error: 'Target user not found' });
      const result = await inviteToGuild(pool, { invitedBy: userId, userId: resolvedTarget });
      if (result.error) return res.status(400).json({ error: result.error });
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to invite user' });
    }
  });

  router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
      const guild = await getGuildForUser(pool, userId);
      if (!guild) return res.json(null);
      const summary = await getGuildSummary(pool, userId);
      res.json({ ...summary, id: guild.id, name: guild.name, members: guild.members?.length || summary?.members || 0 });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load guild' });
    }
  });

  router.get('/:guildId', async (req, res) => {
    const { guildId } = req.params;
    try {
      const guild = await getGuildInfo(pool, guildId);
      res.json(guild || {});
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load guild' });
    }
  });

  router.get('/:guildId/quests', async (req, res) => {
    const { guildId } = req.params;
    try {
      const quests = await getGuildQuests(pool, guildId);
      res.json(quests);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load guild quests' });
    }
  });

  return router;
};
