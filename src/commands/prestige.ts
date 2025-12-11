import inquirer from 'inquirer';
import chalk from 'chalk';
import { isLoggedIn, getConfig } from '../lib/config.js';
import { prestige, getUserStats } from '../lib/api.js';
import { startSpinnerWithSlowNotice, stopSpinner, formatErrorMessage } from '../lib/ui.js';

function guardLogin() {
  if (!isLoggedIn()) {
    console.log(chalk.red('You are not logged in. Run ') + chalk.cyan('rook login') + chalk.red(' first.'));
    process.exit(1);
  }
}

export async function prestigeCommand() {
  guardLogin();
  const config = getConfig();
  if (!config) return;
  const stats = await getUserStats(config.userId);
  if ((stats.level || 1) < 20) {
    console.log(chalk.yellow('Prestige unlocks at level 20. Keep grinding!'));
    return;
  }
  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    { type: 'confirm', name: 'confirm', message: 'Reset to Level 1 and gain permanent perk?' }
  ]);
  if (!confirm) return;
  const { spinner, slowTimer } = startSpinnerWithSlowNotice('Ascending...');
  try {
    const result = await prestige();
    stopSpinner(spinner, slowTimer, 'succeed', 'Prestige complete');
    console.log(chalk.green(`🏅 Prestige ${result.count}: ${result.perkSummary || ''}`));
  } catch (err: any) {
    stopSpinner(spinner, slowTimer, 'fail', 'Prestige failed');
    console.error(chalk.red(formatErrorMessage(err)));
  }
}
