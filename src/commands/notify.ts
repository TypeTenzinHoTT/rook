import inquirer from 'inquirer';
import chalk from 'chalk';
import { isLoggedIn } from '../lib/config.js';
import { saveNotificationIntegration, listNotificationIntegrations } from '../lib/api.js';
import { startSpinnerWithSlowNotice, stopSpinner, formatErrorMessage } from '../lib/ui.js';

function guardLogin() {
  if (!isLoggedIn()) {
    console.log(chalk.red('You are not logged in. Run ') + chalk.cyan('rook login') + chalk.red(' first.'));
    process.exit(1);
  }
}

export async function notify() {
  guardLogin();
  const { selected } = await inquirer.prompt<{ selected: string[] }>([
    {
      type: 'checkbox',
      name: 'selected',
      message: 'Which integrations do you want to enable?',
      choices: [
        { name: 'Slack', value: 'slack', checked: true },
        { name: 'Discord', value: 'discord', checked: true }
      ]
    }
  ]);

  if (!selected.length) {
    console.log(chalk.gray('No integrations selected.'));
    return;
  }

  for (const type of selected) {
    const { url } = await inquirer.prompt<{ url: string }>([
      {
        type: 'input',
        name: 'url',
        message: `${type === 'slack' ? 'Slack' : 'Discord'} webhook URL:`,
        validate: (val: string) => (!!val && val.startsWith('http') ? true : 'Enter a valid URL')
      }
    ]);
    const { spinner, slowTimer } = startSpinnerWithSlowNotice(`Saving ${type} webhook...`);
    try {
      await saveNotificationIntegration(type as 'slack' | 'discord', url);
      stopSpinner(spinner, slowTimer, 'succeed', `${type} connected`);
    } catch (err: any) {
      stopSpinner(spinner, slowTimer, 'fail', `Failed to save ${type}`);
      console.error(chalk.red(formatErrorMessage(err)));
    }
  }

  try {
    const integrations = await listNotificationIntegrations();
    if (integrations?.length) {
      console.log(chalk.green(`\nNotifications enabled:`));
      integrations.forEach((i: any) => console.log(`- ${i.type}: ${i.webhook_url}`));
    }
  } catch {
    // ignore
  }
}
