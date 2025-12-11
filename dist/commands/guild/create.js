import inquirer from 'inquirer';
import chalk from 'chalk';
import { isLoggedIn } from '../../lib/config.js';
import { createGuild } from '../../lib/api.js';
import { startSpinnerWithSlowNotice, stopSpinner, formatErrorMessage } from '../../lib/ui.js';
function guardLogin() {
    if (!isLoggedIn()) {
        console.log(chalk.red('You are not logged in. Run ') + chalk.cyan('rook login') + chalk.red(' first.'));
        process.exit(1);
    }
}
export async function guildCreate(nameArg) {
    guardLogin();
    let name = nameArg;
    if (!name) {
        const response = await inquirer.prompt([
            { type: 'input', name: 'name', message: 'Guild name:' }
        ]);
        name = response.name;
    }
    if (!name) {
        console.log(chalk.gray('Guild name required.'));
        return;
    }
    const { spinner, slowTimer } = startSpinnerWithSlowNotice('Creating guild...');
    try {
        await createGuild(name);
        stopSpinner(spinner, slowTimer, 'succeed', `Guild "${name}" created`);
    }
    catch (err) {
        stopSpinner(spinner, slowTimer, 'fail', 'Failed to create guild');
        console.error(chalk.red(formatErrorMessage(err)));
    }
}
