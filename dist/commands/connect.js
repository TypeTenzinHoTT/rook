import chalk from 'chalk';
import inquirer from 'inquirer';
import boxen from 'boxen';
import { getConfig, isLoggedIn } from '../lib/config.js';
import { connectWebhook } from '../lib/api.js';
import { listManageableRepos } from '../lib/github.js';
import { startSpinnerWithSlowNotice, stopSpinner, formatErrorMessage } from '../lib/ui.js';
function guardLogin() {
    if (!isLoggedIn()) {
        console.log(chalk.red('You are not logged in. Run ') + chalk.cyan('rook login') + chalk.red(' first.'));
        process.exit(1);
    }
}
export async function connect() {
    guardLogin();
    const config = getConfig();
    if (!config)
        return;
    const fetchSpin = startSpinnerWithSlowNotice('Fetching your repos...');
    try {
        const repos = await listManageableRepos();
        stopSpinner(fetchSpin.spinner, fetchSpin.slowTimer);
        if (!repos.length) {
            console.log(chalk.yellow('No repos with push/admin access found. Grant access or try again later.'));
            return;
        }
        const choices = repos.map((r) => ({
            name: `${r.full_name}${r.description ? ' — ' + r.description.slice(0, 60) : ''}`,
            value: r.full_name
        }));
        const { selected } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'selected',
                message: 'Select repos to connect to Rook (webhooks will be created):',
                choices
            }
        ]);
        if (!selected.length) {
            console.log(chalk.gray('No repos selected. Run `rook connect` again anytime.'));
            return;
        }
        const successes = [];
        for (const repoFullName of selected) {
            const spin = startSpinnerWithSlowNotice(`Connecting ${repoFullName}...`);
            try {
                await connectWebhook(repoFullName, config.token);
                stopSpinner(spin.spinner, spin.slowTimer, 'succeed', `Connected ${repoFullName}`);
                successes.push(repoFullName);
            }
            catch (err) {
                stopSpinner(spin.spinner, spin.slowTimer, 'fail', `Failed ${repoFullName}`);
                console.error(chalk.red(formatErrorMessage(err)));
            }
        }
        if (successes.length) {
            console.log(boxen(`${chalk.green('✅ Rook is now listening to:')}
${successes.join(', ')}`, {
                padding: 1,
                borderColor: 'green'
            }));
        }
    }
    catch (err) {
        stopSpinner(fetchSpin.spinner, fetchSpin.slowTimer, 'fail', 'Could not fetch repos');
        console.error(chalk.red(formatErrorMessage(err)));
    }
}
