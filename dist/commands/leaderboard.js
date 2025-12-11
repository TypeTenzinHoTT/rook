import chalk from 'chalk';
import Table from 'cli-table3';
import boxen from 'boxen';
import { io as socketClient } from 'socket.io-client';
import { getConfig, isLoggedIn } from '../lib/config.js';
import { getFriendsLeaderboard, getGlobalLeaderboard } from '../lib/api.js';
import { startSpinnerWithSlowNotice, stopSpinner, formatErrorMessage } from '../lib/ui.js';
function guardLogin() {
    if (!isLoggedIn()) {
        console.log(chalk.red('You are not logged in. Run ') + chalk.cyan('rook login') + chalk.red(' first.'));
        process.exit(1);
    }
}
function buildTable(rows, username) {
    const table = new Table({ head: ['Rank', 'User', 'Level', 'XP', '🏆', '🔥'] });
    rows.forEach((row) => {
        const name = row.username === username ? chalk.cyan.bold(row.username + ' (you)') : row.username;
        table.push([row.rank, name, row.level, row.totalXp, row.achievements, row.streak]);
    });
    return table;
}
export async function leaderboard(opts) {
    guardLogin();
    const config = getConfig();
    if (!config)
        return;
    const limit = Number(opts.limit || 10) || 10;
    const page = Number(opts.page || 1) || 1;
    async function render(showSpinner = true) {
        const spinObj = showSpinner ? startSpinnerWithSlowNotice('Fetching leaderboard...') : null;
        const spinner = spinObj?.spinner || null;
        const slowTimer = spinObj?.slowTimer || null;
        try {
            const entries = opts.friends
                ? await getFriendsLeaderboard(config.userId)
                : await getGlobalLeaderboard(limit, page);
            if (spinner)
                stopSpinner(spinner, slowTimer || null);
            const title = opts.friends ? 'Friends Leaderboard' : 'Global Leaderboard';
            const table = buildTable(entries, config.username);
            console.log(boxen(`${chalk.green(title)} (page ${page})\n${table.toString()}`, {
                padding: 1,
                borderColor: 'green'
            }));
        }
        catch (err) {
            if (spinner)
                stopSpinner(spinner, slowTimer || null, 'fail', 'Could not load leaderboard');
            console.error(chalk.red(formatErrorMessage(err)));
        }
    }
    await render(true);
    if (opts.watch) {
        console.log(chalk.gray('Watching leaderboard (Ctrl+C to stop)...'));
        let fallbackInterval = null;
        let notified = false;
        const baseUrl = (config.apiUrl || '').replace(/\/?api\/?$/, '');
        if (baseUrl) {
            const socket = socketClient(baseUrl, { transports: ['websocket', 'polling'] });
            socket.on('connect', () => console.log(chalk.gray('Connected to real-time updates.')));
            socket.on('leaderboard:update', () => render(false));
            socket.on('loot', (payload) => {
                if (payload?.itemName && payload?.itemIcon) {
                    console.log(chalk.green(`🎁 Loot Drop! You found: ${payload.itemIcon} ${payload.itemName} (now x${payload.quantity || '?'})`));
                }
            });
            socket.on('connect_error', () => {
                if (!fallbackInterval) {
                    if (!notified) {
                        console.log(chalk.gray('Realtime connection failed, falling back to polling... (server may be waking)'));
                        notified = true;
                    }
                    fallbackInterval = setInterval(() => render(false), 5000);
                }
            });
        }
        else {
            fallbackInterval = setInterval(() => render(false), 5000);
        }
    }
}
