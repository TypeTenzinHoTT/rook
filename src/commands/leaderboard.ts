import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import boxen from 'boxen';
import { io as socketClient } from 'socket.io-client';
import { getConfig, isLoggedIn } from '../lib/config.js';
import { getFriendsLeaderboard, getGlobalLeaderboard } from '../lib/api.js';
import { LeaderboardEntry } from '../types/index.js';

function guardLogin() {
  if (!isLoggedIn()) {
    console.log(chalk.red('You are not logged in. Run ') + chalk.cyan('rook login') + chalk.red(' first.'));
    process.exit(1);
  }
}

function buildTable(rows: LeaderboardEntry[], username: string) {
  const table = new Table({ head: ['Rank', 'User', 'Level', 'XP', '🏆', '🔥'] });
  rows.forEach((row) => {
    const name = row.username === username ? chalk.cyan.bold(row.username + ' (you)') : row.username;
    table.push([row.rank, name, row.level, row.totalXp, row.achievements, row.streak]);
  });
  return table;
}

interface LeaderboardOptions {
  friends?: boolean;
  limit?: string;
  page?: string;
  watch?: boolean;
}

export async function leaderboard(opts: LeaderboardOptions) {
  guardLogin();
  const config = getConfig();
  if (!config) return;

  const limit = Number(opts.limit || 10) || 10;
  const page = Number(opts.page || 1) || 1;

  async function render(showSpinner = true) {
    const spinner = showSpinner ? ora('Fetching leaderboard...').start() : null;
    try {
      const entries = opts.friends
        ? await getFriendsLeaderboard(config.userId)
        : await getGlobalLeaderboard(limit, page);
      spinner?.stop();

      const title = opts.friends ? 'Friends Leaderboard' : 'Global Leaderboard';
      const table = buildTable(entries, config.username);

      console.log(
        boxen(`${chalk.green(title)} (page ${page})\n${table.toString()}`, {
          padding: 1,
          borderColor: 'green'
        })
      );
    } catch (err: any) {
      spinner?.fail('Could not load leaderboard');
      console.error(chalk.red(err?.message || err));
    }
  }

  await render(true);

  if (opts.watch) {
    console.log(chalk.gray('Watching leaderboard (Ctrl+C to stop)...'));
    let fallbackInterval: NodeJS.Timer | null = null;
    const baseUrl = (config.apiUrl || '').replace(/\/?api\/?$/, '');
    if (baseUrl) {
      const socket = socketClient(baseUrl, { transports: ['websocket', 'polling'] });
      socket.on('connect', () => console.log(chalk.gray('Connected to real-time updates.')));
      socket.on('leaderboard:update', () => render(false));
      socket.on('connect_error', () => {
        if (!fallbackInterval) {
          fallbackInterval = setInterval(() => render(false), 5000);
        }
      });
    } else {
      fallbackInterval = setInterval(() => render(false), 5000);
    }
  }
}
