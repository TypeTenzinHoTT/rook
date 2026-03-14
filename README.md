# Rook: The Developer's Roguelike

A gamified CLI that turns daily developer work into an RPG adventure. Earn XP from GitHub activity, clear daily and weekly quests, climb leaderboards, craft items, and compete with friends.

[![npm version](https://img.shields.io/npm/v/rook-rpg.svg)](https://www.npmjs.com/package/rook-rpg)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Install

```bash
npm install -g rook-rpg
```

## Quickstart

```bash
rook init
```

This walks you through GitHub authentication and repo connection. Once set up, your commits, PRs, issues, and reviews automatically earn XP.

## Commands

| Command | Description |
|---------|-------------|
| `rook init` | Onboarding: authenticate + connect repos |
| `rook login` | Authenticate with GitHub PAT |
| `rook stats` | View level, XP, streak, achievements |
| `rook dungeon` | Daily quests and weekly boss quests |
| `rook leaderboard` | Global or friends-only rankings |
| `rook friends` | Manage your party |
| `rook inventory` | View your loot drops |
| `rook craft` | Craft items from loot |
| `rook guild` | Create, join, or manage guilds |
| `rook prestige` | Reset at level 20+ for permanent perks |
| `rook connect` | Connect GitHub repos via webhooks |
| `rook history` | XP activity timeline |
| `rook share` | Generate share links or shareable stats output |
| `rook notify` | Configure social notifications |

### Leaderboard Options

```bash
rook leaderboard --friends --limit 20 --page 2 --watch
```

## Game Mechanics

- **XP**: Earned from commits, PRs, code reviews, and issue closures
- **Levels**: `floor(sqrt(totalXp / 1000)) + 1`
- **Daily Quests**: 5 quests that reset at midnight UTC
- **Weekly Boss**: Large objectives that reset each week
- **Loot**: RNG drops with a luck meter that increases rare drop chances
- **Crafting**: Combine loot items into powerful artifacts
- **Guilds**: Team up for shared XP multipliers (up to 10% bonus)
- **Prestige**: Reset at level 20+ for permanent +2% XP, +1 rare drop/day, -1% crafting cost per reset
- **Streaks**: Consecutive active days multiply rewards

## Self-Hosting the Backend

The backend is an Express + PostgreSQL + Socket.io server.

```bash
cd backend
npm install
```

Set environment variables:

```bash
DATABASE_URL=postgres://user:pass@host:5432/rook
PORT=4000
GITHUB_WEBHOOK_SECRET=your_secret
OPENAI_API_KEY=optional_for_coach_tips
```

Run:

```bash
npm start
```

Point the CLI at your backend:

```bash
ROOK_API_URL=http://localhost:4000/api rook login
```

Then keep the default API URL when prompted.

## API Reference

See the full [API documentation](https://rook.ai/docs/api-reference/introduction).

## Configuration

Config is stored at `~/.rook/config.json` and contains your GitHub token, user ID, and API URL.

## Contributing

Pull requests welcome. See [CONTRIBUTOR.md](CONTRIBUTOR.md) for project contribution guidelines and [docs/contributing.mdx](docs/contributing.mdx) for the docs-focused guide.

## License

[MIT](LICENSE)
