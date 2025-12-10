import figlet from 'figlet';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';
import { Octokit } from 'octokit';
import { saveConfig } from '../lib/config.js';
import { registerUser } from '../lib/api.js';
import { formatErrorMessage } from '../lib/ui.js';

function banner(): Promise<string> {
  return new Promise((resolve, reject) => {
    figlet.text('Rook', { horizontalLayout: 'default' }, (err, data) => {
      if (err) return reject(err);
      resolve(data || 'Rook');
    });
  });
}

export async function login() {
  try {
    const art = await banner();
    console.log(gradient.pastel.multiline(art));
    console.log(chalk.cyan('Welcome to Rook: The Developer\'s Roguelike!'));

    const answers = await inquirer.prompt<{
      token: string;
      apiUrl: string;
    }>([
      {
        type: 'password',
        name: 'token',
        message: 'Enter your GitHub Personal Access Token (classic, repo/read:user scopes):',
        mask: '*',
        validate: (input) => (input ? true : 'Token is required')
      },
      {
        type: 'input',
        name: 'apiUrl',
        message: 'Rook API URL',
        default: 'https://rook-3658.onrender.com/api'
      }
    ]);

  const spinner = ora('Verifying GitHub token...').start();
  const octokit = new Octokit({ auth: answers.token });
  const { data: user } = await octokit.rest.users.getAuthenticated();
  spinner.succeed('GitHub verified!');

  const backendSpinner = ora('Registering with Rook backend...').start();
  process.env.ROOK_API_URL = answers.apiUrl;
  const registration = await registerUser(String(user.id), user.login, answers.token);
  backendSpinner.succeed('Registered with Rook backend!');

    saveConfig({
      token: answers.token,
      username: user.login,
      userId: registration?.userId || String(registration?.id || user.id),
      apiUrl: answers.apiUrl
    });

    console.log(
      boxen(
        `${chalk.green('Authentication successful!')}\n\n` +
          `Hello ${gradient.pastel(user.login)}!\n` +
          `Next up: run ${chalk.cyan('rook stats')} to view your profile, ` +
          `then ${chalk.cyan('rook dungeon')} to slay daily quests.`,
        { padding: 1, borderColor: 'green' }
      )
    );
  } catch (error: any) {
    console.error(chalk.red('Login failed:'), formatErrorMessage(error));
    console.error(chalk.yellow('Tips: ensure your PAT has read:user and repo scopes, and the API URL is reachable.'));
    process.exitCode = 1;
  }
}
