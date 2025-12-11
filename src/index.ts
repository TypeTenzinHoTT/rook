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
import { craft } from './commands/craft.js';
import { init } from './commands/init.js';
import { notify } from './commands/notify.js';
import { guildCreate } from './commands/guild/create.js';
import { guildJoin } from './commands/guild/join.js';
import { guildInvite } from './commands/guild/invite.js';
import { guildLeave } from './commands/guild/leave.js';
import { guildStats } from './commands/guild/stats.js';
import { prestigeCommand } from './commands/prestige.js';

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
program.command('craft').description('Craft items from your loot').action(craft);
program.command('init').description('Initialize Rook: login + connect repos').action(init);
program.command('notify').description('Configure social notifications').action(notify);

const guild = program.command('guild').description('Manage guilds');
guild.command('create').argument('[name]', 'Guild name').action(guildCreate);
guild.command('join').argument('[name]', 'Guild name').action(guildJoin);
guild.command('invite').argument('[username]', 'Username to invite').action(guildInvite);
guild.command('leave').description('Leave your guild').action(guildLeave);
guild.command('stats').description('View guild stats').action(guildStats);

program.command('prestige').description('Reset to level 1 for permanent perks').action(prestigeCommand);

program.parse();
