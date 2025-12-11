import chalk from 'chalk';
import Table from 'cli-table3';
import { getConfig, isLoggedIn } from '../lib/config.js';
import { getInventory } from '../lib/api.js';
import { startSpinnerWithSlowNotice, stopSpinner, formatErrorMessage, maybeShowTip } from '../lib/ui.js';

function guardLogin() {
  if (!isLoggedIn()) {
    console.log(chalk.red('You are not logged in. Run ') + chalk.cyan('rook login') + chalk.red(' first.'));
    process.exit(1);
  }
}

const rarityColor: Record<string, (val: string) => string> = {
  common: (v: string) => v,
  rare: chalk.cyan,
  epic: chalk.magenta,
  legendary: chalk.yellow
};

export async function inventory() {
  guardLogin();
  const config = getConfig();
  if (!config) return;

  const spin = startSpinnerWithSlowNotice('Opening your pack...');
  try {
    const items = await getInventory(config.userId);
    stopSpinner(spin.spinner, spin.slowTimer);
    if (!items || !items.length) {
      console.log(chalk.gray('No loot yet. Earn XP to find your first drop!'));
      return;
    }
    const table = new Table({ head: ['Icon', 'Name', 'Rarity', 'Qty'] });
    items.forEach((it: any) => {
      const color = rarityColor[it.rarity] || ((v: string) => v);
      table.push([it.icon || '🎁', color(it.name), color(it.rarity), it.quantity]);
    });
    console.log(chalk.bold('📦 Inventory'));
    console.log(table.toString());
  } catch (err: any) {
    stopSpinner(spin.spinner, spin.slowTimer, 'fail', 'Could not load inventory');
    console.error(chalk.red(formatErrorMessage(err)));
  } finally {
    maybeShowTip();
  }
}
