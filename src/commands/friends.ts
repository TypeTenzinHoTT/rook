import chalk from 'chalk';
import Table from 'cli-table3';
import boxen from 'boxen';
import { getConfig, isLoggedIn } from '../lib/config.js';
import { addFriend, getFriends, getFriendsLeaderboard, removeFriend } from '../lib/api.js';
import { startSpinnerWithSlowNotice, stopSpinner, formatErrorMessage } from '../lib/ui.js';

function guardLogin() {
  if (!isLoggedIn()) {
    console.log(chalk.red('You are not logged in. Run ') + chalk.cyan('rook login') + chalk.red(' first.'));
    process.exit(1);
  }
}

async function listFriends(userId: string, username: string) {
  const { spinner, slowTimer } = startSpinnerWithSlowNotice('Loading friends...');
  try {
    const friendsList = await getFriends(userId);
    stopSpinner(spinner, slowTimer);
    const table = new Table({ head: ['User', '🔥 Streak'] });
    friendsList.forEach((f: any) => table.push([f.username, f.streak || 0]));
    console.log(boxen(`${chalk.green('Friends')}\n${table.toString()}`, { padding: 1, borderColor: 'cyan' }));
  } catch (err: any) {
    stopSpinner(spinner, slowTimer, 'fail', 'Could not load friends');
    console.error(chalk.red(formatErrorMessage(err)));
  }
}

async function addFriendFlow(userId: string, friendUsername?: string) {
  if (!friendUsername) {
    console.error(chalk.red('Usage: rook friends add <username>'));
    return;
  }
  const { spinner, slowTimer } = startSpinnerWithSlowNotice(`Sending friend request to ${friendUsername}...`);
  try {
    await addFriend(userId, friendUsername);
    stopSpinner(spinner, slowTimer, 'succeed', 'Friend added!');
  } catch (err: any) {
    stopSpinner(spinner, slowTimer, 'fail', 'Could not add friend');
    console.error(chalk.red(formatErrorMessage(err)));
  }
}

async function removeFriendFlow(userId: string, friendUsername?: string) {
  if (!friendUsername) {
    console.error(chalk.red('Usage: rook friends remove <username>'));
    return;
  }
  const { spinner, slowTimer } = startSpinnerWithSlowNotice(`Removing ${friendUsername}...`);
  try {
    await removeFriend(userId, friendUsername);
    stopSpinner(spinner, slowTimer, 'succeed', 'Friend removed.');
  } catch (err: any) {
    stopSpinner(spinner, slowTimer, 'fail', 'Could not remove friend');
    console.error(chalk.red(formatErrorMessage(err)));
  }
}

async function leaderboardFriends(userId: string, username: string) {
  const { spinner, slowTimer } = startSpinnerWithSlowNotice('Loading friends leaderboard...');
  try {
    const entries = await getFriendsLeaderboard(userId);
    stopSpinner(spinner, slowTimer);
    const table = new Table({ head: ['Rank', 'User', 'Level', 'XP', '🔥'] });
    entries.forEach((row: any) => {
      const name = row.username === username ? chalk.cyan.bold(row.username + ' (you)') : row.username;
      table.push([row.rank, name, row.level, row.totalXp, row.streak]);
    });
    console.log(boxen(`${chalk.green('Friends Leaderboard')}\n${table.toString()}`, { padding: 1, borderColor: 'green' }));
  } catch (err: any) {
    stopSpinner(spinner, slowTimer, 'fail', 'Could not load friends leaderboard');
    console.error(chalk.red(formatErrorMessage(err)));
  }
}

export async function friends(action?: string, username?: string) {
  guardLogin();
  const config = getConfig();
  if (!config) return;

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
