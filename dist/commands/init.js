import chalk from 'chalk';
import inquirer from 'inquirer';
import { login } from './login.js';
import { connect } from './connect.js';
import { maybeShowTip } from '../lib/ui.js';
import { getConfig } from '../lib/config.js';
export async function init() {
    try {
        const config = getConfig();
        if (config?.username) {
            console.log(chalk.green(`✓ Already logged in as ${config.username}`));
        }
        else {
            await login();
        }
        const { shouldConnect } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'shouldConnect',
                message: 'Would you like to connect your GitHub repos now so Rook can track commits and give XP?',
                default: true
            }
        ]);
        if (shouldConnect) {
            await connect();
        }
        else {
            console.log(chalk.gray('No problem! You can run `rook connect` later.'));
        }
        console.log(chalk.green('\n🎉 You\'re all set!\n'));
        console.log('Next commit → XP');
        console.log('Next PR → loot');
        console.log('Next issue → crafting materials\n');
        console.log(chalk.dim('Run `rook stats` anytime to see your progress.'));
    }
    catch (error) {
        console.log(chalk.red('✖ Initialization failed'));
        if (error instanceof Error) {
            console.log(chalk.dim(error.message));
        }
    }
    finally {
        maybeShowTip();
    }
}
