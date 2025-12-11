import inquirer from 'inquirer';
import chalk from 'chalk';
import { isLoggedIn } from '../../lib/config.js';
import { inviteToGuild } from '../../lib/api.js';
import { startSpinnerWithSlowNotice, stopSpinner, formatErrorMessage } from '../../lib/ui.js';

function guardLogin() {
  if (!isLoggedIn()) {
    console.log(chalk.red('You are not logged in. Run ') + chalk.cyan('rook login') + chalk.red(' first.'));
    process.exit(1);
  }
}

export async function guildInvite(usernameArg?: string) {
  guardLogin();
  let username = usernameArg;
  if (!username) {
    const response = await inquirer.prompt<{ username: string }>([
      { type: 'input', name: 'username', message: 'Who do you want to invite?' }
    ]);
    username = response.username;
  }
  if (!username) {
    console.log(chalk.gray('Username required.'));
    return;
  }
  const { spinner, slowTimer } = startSpinnerWithSlowNotice(`Inviting ${username}...`);
  try {
    await inviteToGuild(username);
    stopSpinner(spinner, slowTimer, 'succeed', `Invite sent to ${username}`);
  } catch (err: any) {
    stopSpinner(spinner, slowTimer, 'fail', 'Failed to send invite');
    console.error(chalk.red(formatErrorMessage(err)));
  }
}
