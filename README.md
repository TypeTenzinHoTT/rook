# Rook: The Developer's Roguelike

A gamified CLI that turns daily developer work into an RPG loop. Track XP from GitHub, clear daily/weekly quests, climb leaderboards, and share wins with friends.

## Quickstart
1. Install deps: `npm install`
2. Dev run CLI: `npm run dev -- <command>` (example: `npm run dev -- login`)
3. Build: `npm run build`
4. Link locally: `npm link` then run `rook <command>`

## CLI Commands
- `rook login` – Authenticate with GitHub (PAT) and register with the Rook backend.
- `rook stats` – View level, XP bar, streak, recent achievements, and XP log.
- `rook dungeon` – List daily quests (🗡️) and weekly boss quests (⚔️) with progress.
- `rook leaderboard [--friends] [--limit N] [--page N] [--watch]` – View global/friends ladder, highlight yourself, auto-refresh with Socket.io or polling when watching.
- `rook friends [list|add|remove|leaderboard]` – Manage your party and see friends-only ranks.
- `rook share <achievement|stats> [id] [--twitter|--discord|--slack]` – Generate shareable links or ASCII stats cards.
- `rook connect` – Select repos and auto-create GitHub webhooks pointing at the Rook backend.
- `rook history` – View your recent XP timeline.

## Backend
- Stack: Express + PostgreSQL + Socket.io
- Run: set `DATABASE_URL`, optionally `PGSSL=1`, then `npm run backend` (defaults to `PORT=4000`).
- Health check: `GET /api/health`
- Schema: `backend/schema.sql`
- Webhooks: `POST /api/webhooks/github` (set `GITHUB_WEBHOOK_SECRET` to verify). Handles push/PR/issue/review events and emits leaderboard updates.

### Key API Routes
- `POST /api/users/register`
- `GET /api/users/:userId/stats`
- `POST /api/users/:userId/xp`
- `GET /api/users/:userId/quests/daily`
- `GET /api/users/:userId/quests/weekly`
- `POST /api/users/:userId/quests/:questId/complete`
- `GET /api/leaderboard/global?limit=&page=`
- `GET /api/users/:userId/leaderboard/friends`
- `GET /api/users/:userId/friends`
- `POST /api/users/:userId/friends`
- `DELETE /api/users/:userId/friends/:friendId`
- `GET /api/users/:userId/activity?limit=`
- `GET /api/users/:userId/xp?limit=` (alias for XP history)
- `POST /api/users/:userId/achievements/:achievementId/share`
- `POST /api/github/webhooks` (body: `{ repoFullName, token }`) to auto-configure repo webhooks pointing to `/api/webhooks/github`

## Notes
- Config stored at `~/.rook/config.json` (contains GitHub token, user id, API URL).
- Level formula: `floor(sqrt(totalXp / 1000)) + 1` with per-level progress bars.
- Daily quests reset at midnight UTC; weekly boss quests regenerate each week.
- Leaderboards broadcast `leaderboard:update` events via Socket.io; CLI `--watch` auto-refreshes.
- Optional coach tips: set `OPENAI_API_KEY` on the backend to receive one-line guidance in `rook stats`.

## Local Testing Flow
- Backend env: `DATABASE_URL=postgres://...`, `PORT=4000`, `GITHUB_WEBHOOK_SECRET=<secret>`, optional `OPENAI_API_KEY`.
- Start backend: `cd backend && npm start` (http://localhost:4000).
- CLI: `rook login --api-url http://localhost:4000/api`.
- `rook connect` and pick a test repo to auto-create webhooks.
- Trigger commits/PRs/issues/reviews; then:
  - `rook stats` (XP, streak, achievements, coach tip when OpenAI enabled)
  - `rook dungeon` (quest progress ticks up)
  - `rook history` (XP activity log)
  - `rook leaderboard --watch` (live updates or polling fallback)

## Production Verification
- Render web service URL: https://rook-3658.onrender.com/api (Supabase DATABASE_URL with SSL as required).
- `rook login` (defaults to the Render API), then `rook connect` for real repos.
- Use real GitHub activity to confirm quests, streaks, achievements, weekly XP quest, coach tips (if OpenAI enabled), and leaderboard updates.
# Production deployment complete! 🎉
# Webhook working perfectly! 🚀
# Test 
another test
// test
// achievement test
// trigger achievement
// streak test
// quest test
// rook connect test
# Quests table added! 🎮
# Testing quest completion! 🗡️
# Testing 🗡️
