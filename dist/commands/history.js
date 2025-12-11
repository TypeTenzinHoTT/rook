import chalk from 'chalk';
import Table from 'cli-table3';
import { getConfig, isLoggedIn } from '../lib/config.js';
import { getXpHistory } from '../lib/api.js';
import { startSpinnerWithSlowNotice, stopSpinner, formatErrorMessage } from '../lib/ui.js';
function guardLogin() {
    if (!isLoggedIn()) {
        console.log(chalk.red('You are not logged in. Run ') + chalk.cyan('rook login') + chalk.red(' first.'));
        process.exit(1);
    }
}
export async function history() {
    guardLogin();
    const config = getConfig();
    if (!config)
        return;
    const spin = startSpinnerWithSlowNotice('Retrieving your XP log...');
    try {
        const rows = await getXpHistory(config.userId, 20);
        stopSpinner(spin.spinner, spin.slowTimer);
        if (!rows || !rows.length) {
            console.log(chalk.gray('No XP yet — push some code or open a PR to start your adventure.'));
            return;
        }
        const table = new Table({ head: ['Date', 'XP', 'Reason', 'Type'] });
        rows.forEach((r) => {
            table.push([
                new Date(r.created_at).toLocaleString(),
                `+${r.amount}`,
                r.reason || r.activity_type || 'activity',
                r.activity_type || 'manual'
            ]);
        });
        console.log(table.toString());
    }
    catch (err) {
        stopSpinner(spin.spinner, spin.slowTimer, 'fail', 'Could not load history');
        console.error(chalk.red(formatErrorMessage(err)));
    }
}
