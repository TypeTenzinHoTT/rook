import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import usersRoutes from './routes/users.js';
import questsRoutes from './routes/quests.js';
import leaderboardRoutes from './routes/leaderboard.js';
import socialRoutes from './routes/social.js';
import githubWebhook from './webhooks/github.js';
import { seedAchievements } from './lib/progression.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected PG error', err);
});

app.set('pool', pool);

app.use('/api/users', usersRoutes(pool));
app.use('/api/users', questsRoutes(pool));
app.use('/api', leaderboardRoutes(pool));
app.use('/api/users', socialRoutes(pool));
app.use('/api/webhooks/github', githubWebhook(pool));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 4000;

(async () => {
  try {
    await seedAchievements(pool);
    server.listen(port, () => {
      console.log(`[rook-backend] listening on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to seed achievements', err);
    process.exit(1);
  }
})();
