import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import boxen from 'boxen';
import { getConfig, isLoggedIn } from '../lib/config.js';
import { addFriend, getFriends, getFriendsLeaderboard, removeFriend } from '../lib/api.js';
function guardLogin() {
    if (!isLoggedIn()) {
        console.log(chalk.red('You are not logged in. Run ') + chalk.cyan('rook login') + chalk.red(' first.'));
        process.exit(1);
    }
}
async function listFriends(userId, username) {
    const spinner = ora('Loading friends...').start();
    try {
        const friendsList = await getFriends(userId);
        spinner.stop();
        const table = new Table({ head: ['User', '🔥 Streak'] });
        friendsList.forEach((f) => table.push([f.username, f.streak || 0]));
        console.log(boxen(`${chalk.green('Friends')}\n${table.toString()}`, { padding: 1, borderColor: 'cyan' }));
    }
    catch (err) {
        spinner.fail('Could not load friends');
        console.error(chalk.red(err?.message || err));
    }
}
async function addFriendFlow(userId, friendUsername) {
    if (!friendUsername) {
        console.error(chalk.red('Usage: rook friends add <username>'));
        return;
    }
    const spinner = ora(`Sending friend request to ${friendUsername}...`).start();
    try {
        await addFriend(userId, friendUsername);
        spinner.succeed('Friend added!');
    }
    catch (err) {
        spinner.fail('Could not add friend');
        console.error(chalk.red(err?.message || err));
    }
}
async function removeFriendFlow(userId, friendUsername) {
    if (!friendUsername) {
        console.error(chalk.red('Usage: rook friends remove <username>'));
        return;
    }
    const spinner = ora(`Removing ${friendUsername}...`).start();
    try {
        await removeFriend(userId, friendUsername);
        spinner.succeed('Friend removed.');
    }
    catch (err) {
        spinner.fail('Could not remove friend');
        console.error(chalk.red(err?.message || err));
    }
}
async function leaderboardFriends(userId, username) {
    const spinner = ora('Loading friends leaderboard...').start();
    try {
        const entries = await getFriendsLeaderboard(userId);
        spinner.stop();
        const table = new Table({ head: ['Rank', 'User', 'Level', 'XP', '🔥'] });
        entries.forEach((row) => {
            const name = row.username === username ? chalk.cyan.bold(row.username + ' (you)') : row.username;
            table.push([row.rank, name, row.level, row.totalXp, row.streak]);
        });
        console.log(boxen(`${chalk.green('Friends Leaderboard')}\n${table.toString()}`, { padding: 1, borderColor: 'green' }));
    }
    catch (err) {
        spinner.fail('Could not load friends leaderboard');
        console.error(chalk.red(err?.message || err));
    }
}
export async function friends(action, username) {
    guardLogin();
    const config = getConfig();
    if (!config)
        return;
    switch ((action || 'list').toLowerCase()) {
        case 'list':
            await listFriends(config.userId, config.username);
            break;
        case 'add':
            await addFriendFlow(config.userId, username);
            break;
        case 'remove':
            await removeFriendFlow(config.userId, username);
            break;
        case 'leaderboard':
            await leaderboardFriends(config.userId, config.username);
            break;
        default:
            console.error(chalk.red('Unknown friends command. Use list, add, remove, leaderboard.'));
    }
}
