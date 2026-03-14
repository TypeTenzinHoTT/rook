# 📚 Rook Documentation

Welcome to the internal documentation for **Rook — The Developer Roguelike**.
This folder contains everything you need to:

- Understand the architecture  
- Extend or contribute to the system  
- Publish open-source launch materials  
- Review the API  
- Onboard contributors  

📁 Contents:

- screenshots/ — UI assets used in README
- launch/ — Show HN, Twitter, Product Hunt, Demo Script
- architecture.md
- api-reference.md
- roadmap.md
- contributing.md
- philosophy.md




docs/screenshots/
  stats.png          ← Screenshot of `rook stats`
  inventory.png      ← Screenshot of loot inventory table
  crafting.png       ← Screenshot of `rook craft` menu
  dungeon.png        ← Daily quests & weekly bosses screen
  leaderboard.png    ← Real-time watch mode feed




# 🏗️ Rook Architecture

Rook is a hybrid **CLI + backend** system.

## Overview

- **CLI:** Node + TypeScript  
- **Backend:** Node (ESM), Express, PostgreSQL  
- **Events:** GitHub Webhooks → backend → Socket.io → CLI  
- **Game engine:** XP, loot, crafting, quests, progression  

## Data Flow

1. Developer pushes code  
2. GitHub webhook calls backend  
3. Backend awards XP → loot → crafting ingredients  
4. CLI receives live events via Socket.io  
5. Player sees XP, loot, quests update in real time  

## Database Schema (Core)

- `users`
- `xp_events`
- `loot_items`
- `loot_drops`
- `crafting_recipes`
- `crafting_recipe_ingredients`
- `quests_daily`, `quests_weekly`
- `user_progress`

## CLI Architecture

- `src/commands/`  
  stats, inventory, craft, dungeon, leaderboard, connect, init

- `src/lib/api.ts`  
  API wrapper for backend

- `src/lib/ui.ts`  
  spinners, styling, viral tips

- `src/types/index.ts`  
  shared types for UserStats, CraftingRecipe, LootItem

## Backend Architecture

- `backend/server.js`
- `backend/routes/*.js`
- `backend/lib/*.js`
- `backend/migrations/*.sql`

Backend uses **ESM**, no CommonJS allowed.

## Real-Time Engine

Socket.io emits:

- `xp` events  
- `loot` events  
- `craft` events  
- `quest` events  

CLI uses a persistent socket in:

- `leaderboard.ts`
- (optional) future dashboard



# 📡 Rook API Reference

Base URL: Set via `PUBLIC_API_URL` environment variable (e.g., your GCP Cloud Run URL)

---

## GET /users/:userId/stats

Returns:

- username  
- streak  
- totalXp  
- achievements  
- recentXp  
- recentLoot  
- craftingRecipes[]  
- quests (daily + weekly)  

CLI uses this for:
- rook stats  
- rook craft  
- rook inventory  

---

## POST /users/:userId/xp
Award XP.

Body:
{
  amount: number,
  activityType: string,
  reason?: string
}

---

## GET /users/:userId/loot
Returns inventory.

---

## POST /crafting/:userId/craft/:recipeCode
Crafts an item from ingredients.

Returns:
{
  success: true,
  crafted: "Iron Blade",
  icon: "🔷",
  newQuantity: 5
}

Emits:
socket.emit('craft', {...})

---

## /webhooks/github
GitHub event receiver.

Handles:  
- push  
- pull_request  
- issue_comment  
- review events  

Awards XP & loot.



# 🗺️ Rook Roadmap

## v1.0 — Public Launch (NOW)
✔ Loot System  
✔ Crafting System  
✔ XP + Levels  
✔ Inventory  
✔ Webhooks  
✔ Daily Quests  
✔ Weekly Bosses  
✔ Rook Init onboarding  
✔ Viral Tips Engine  
✔ MIT Open Source Release  

---

## v1.5 — Multiplayer
- Guilds
- Shared XP pool
- Team quests
- Guild leaderboard
- Cooperative crafting
- Trading items between players

---

## v2.0 — Web Dashboard
- OAuth login
- Live activity feed
- Quest dashboard
- 3D roguelike avatar
- Badge system
- Public profiles

---

## v3.0 — Monetization (Optional)
- Pro themes (CLI skins)
- Guild premium features
- Team analytics dashboard
- Custom loot tables per team

---

## Long-Term Vision
Rook becomes:
**The GitHub Duolingo / Strava for developers.**


# 🧠 Rook Philosophy

Rook is built on 3 principles:

---

## 1. Make developers FEEL progression

Coding is slow feedback.  
Rook gives *instant* feedback:
- XP  
- Loot  
- Crafting  
- Quests  
- Streaks  

---

## 2. Zero friction

The CLI must:
- install instantly  
- onboard in 10 seconds  
- never break git workflows  
- never interrupt focus  

---

## 3. Designed to be addictive

We use game psychology:
- streaks  
- leveling curves  
- daily resets  
- weekly bosses  
- rare loot  
- crafting  
- real-time dopamine toasts  

This keeps players engaged naturally.

---

Rook turns your work into a game *you want to keep playing*.



# 🤝 Contributing to Rook

Thanks for thinking about contributing!

---

## How to contribute

1. Fork the repo  
2. Make a branch  
3. Run the backend + CLI locally  
4. Submit PR  

---

## Code Style

### Backend:
- Node.js ESM only
- No CommonJS
- Descriptive function names
- SQL migrations must be additive
- No breaking API changes

### CLI:
- TypeScript required
- No renaming of commands
- No breaking UX output
- All UI updates must be additive

---

## Pull Request Tips

- Add screenshots for UI changes  
- Add tests where possible  
- Keep changes small and focused  
- Include migration files if needed  

---

## Need help?
Open an issue with:
- reproduction steps  
- logs  
- OS + Node version  
- CLI version  




# 🎬 Rook 30-Second Demo Script

[0:00–0:02]
Terminal opens.
$ rook stats

[0:02–0:06]
Beautiful XP UI appears.

[0:06–0:10]
User merges a PR on GitHub.
CLI pops:
+50 XP
+1 Insight Crystal

[0:10–0:14]
$ rook inventory

Inventory table slides in.

[0:14–0:18]
$ rook craft
User selects “Phoenix Core”.
✨ Crafted: Phoenix Core 🔥

[0:18–0:22]
$ rook dungeon
Daily quests + weekly bosses appear.

[0:22–0:26]
$ rook leaderboard --watch
Real-time XP & loot feed updates.

[0:26–0:30]
Final tagline:
"Turn your GitHub activity into a game."



