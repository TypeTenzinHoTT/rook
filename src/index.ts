#!/usr/bin/env node
import { Command } from 'commander';
import { login } from './commands/login.js';
import { stats } from './commands/stats.js';
import { dungeon } from './commands/dungeon.js';
import { leaderboard } from './commands/leaderboard.js';
import { friends } from './commands/friends.js';
import { share } from './commands/share.js';
import { connect } from './commands/connect.js';
import { history } from './commands/history.js';
import { inventory } from './commands/inventory.js';

const program = new Command();

program
  .name('rook')
  .description("The Developer's Roguelike CLI")
  .version('0.1.0');

program.command('login').description('Authenticate with GitHub').action(login);
program.command('stats').description('View your stats').action(stats);
program.command('dungeon').description('View daily quests').action(dungeon);
program
  .command('leaderboard')
  .option('-f, --friends', 'Show friends only')
  .option('-p, --page <page>', 'Page number', '1')
  .option('-l, --limit <limit>', 'Number of rows', '10')
  .option('-w, --watch', 'Auto-refresh leaderboard')
  .action(leaderboard);
program.command('friends').description('Manage friends').argument('[action]', 'list|add|remove|leaderboard').argument('[username]', 'username for add/remove').action(friends);
program.command('share').description('Share stats or an achievement').argument('<target>', 'achievement|stats').argument('[achievementId]', 'achievement id when sharing achievement').option('--twitter', 'Share to Twitter').option('--discord', 'Share to Discord').option('--slack', 'Share to Slack').action(share);
program.command('connect').description('Connect GitHub repos to auto-configure webhooks').action(connect);
program.command('history').description('View your XP history').action(history);
program.command('inventory').description('View your loot inventory').action(inventory);

program.parse();
