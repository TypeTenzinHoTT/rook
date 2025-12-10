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
- `POST /api/users/:userId/achievements/:achievementId/share`

## Notes
- Config stored at `~/.rook/config.json` (contains GitHub token, user id, API URL).
- Level formula: `floor(sqrt(totalXp / 1000)) + 1` with per-level progress bars.
- Daily quests reset at midnight UTC; weekly boss quests regenerate each week.
- Leaderboards broadcast `leaderboard:update` events via Socket.io; CLI `--watch` auto-refreshes.

## Test Flow
1. `rook login`
2. `rook stats`
3. Make a commit on GitHub (or trigger webhook)
4. `rook stats` (XP should increase)
5. `rook dungeon`
6. `rook leaderboard`
7. `rook friends add <username>`
8. `rook leaderboard --friends`
# Production deployment complete! 🎉
