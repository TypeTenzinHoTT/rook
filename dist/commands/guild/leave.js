import inquirer from 'inquirer';
import chalk from 'chalk';
import { isLoggedIn } from '../../lib/config.js';
import { leaveGuild } from '../../lib/api.js';
import { startSpinnerWithSlowNotice, stopSpinner, formatErrorMessage } from '../../lib/ui.js';
function guardLogin() {
    if (!isLoggedIn()) {
        console.log(chalk.red('You are not logged in. Run ') + chalk.cyan('rook login') + chalk.red(' first.'));
        process.exit(1);
    }
}
export async function guildLeave() {
    guardLogin();
    const { confirm } = await inquirer.prompt([
        { type: 'confirm', name: 'confirm', message: 'Leave your current guild?' }
    ]);
    if (!confirm)
        return;
    const { spinner, slowTimer } = startSpinnerWithSlowNotice('Leaving guild...');
    try {
        await leaveGuild();
        stopSpinner(spinner, slowTimer, 'succeed', 'Left guild');
    }
    catch (err) {
        stopSpinner(spinner, slowTimer, 'fail', 'Failed to leave guild');
        console.error(chalk.red(formatErrorMessage(err)));
    }
}
