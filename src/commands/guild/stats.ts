import chalk from 'chalk';
import boxen from 'boxen';
import { isLoggedIn } from '../../lib/config.js';
import { getGuildStats } from '../../lib/api.js';
import { startSpinnerWithSlowNotice, stopSpinner, formatErrorMessage } from '../../lib/ui.js';

function guardLogin() {
  if (!isLoggedIn()) {
    console.log(chalk.red('You are not logged in. Run ') + chalk.cyan('rook login') + chalk.red(' first.'));
    process.exit(1);
  }
}

export async function guildStats() {
  guardLogin();
  const { spinner, slowTimer } = startSpinnerWithSlowNotice('Fetching guild stats...');
  try {
    const guild = await getGuildStats();
    stopSpinner(spinner, slowTimer);
    if (!guild) {
      console.log(chalk.gray('You are not in a guild yet.'));
      return;
    }
    const bonusPct = Math.round((guild.bonus || 0) * 100);
    console.log(
      boxen(
        `${chalk.cyan(`🏰 ${guild.name}`)}\nMembers: ${guild.members || 0}\nActive: ${guild.active || 0}\nXP Bonus: +${bonusPct}%`,
        { padding: 1, borderColor: 'cyan' }
      )
    );
  } catch (err: any) {
    stopSpinner(spinner, slowTimer, 'fail', 'Failed to load guild stats');
    console.error(chalk.red(formatErrorMessage(err)));
  }
}
