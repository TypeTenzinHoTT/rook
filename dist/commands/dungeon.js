import chalk from 'chalk';
import Table from 'cli-table3';
import boxen from 'boxen';
import { getConfig, isLoggedIn } from '../lib/config.js';
import { getDailyQuests, getWeeklyQuests } from '../lib/api.js';
import { progressBar } from '../lib/xp.js';
import { startSpinnerWithSlowNotice, stopSpinner, formatErrorMessage } from '../lib/ui.js';
function guardLogin() {
    if (!isLoggedIn()) {
        console.log(chalk.red('You are not logged in. Run ') + chalk.cyan('rook login') + chalk.red(' first.'));
        process.exit(1);
    }
}
function formatQuestRow(q) {
    const status = q.completed ? '✅' : '🗡️';
    const progress = q.progress ? progressBar(q.progress.current, q.progress.total) : '';
    return [status, chalk.yellow(q.title), `${q.xpReward} XP`, progress || q.description];
}
function timeUntilReset() {
    const now = new Date();
    const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const diffMs = reset.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
    return `${hours}h ${minutes}m until reset`;
}
export async function dungeon() {
    guardLogin();
    const config = getConfig();
    if (!config)
        return;
    const { spinner, slowTimer } = startSpinnerWithSlowNotice('Entering the daily dungeon...');
    try {
        const [daily, weekly] = await Promise.all([
            getDailyQuests(config.userId),
            getWeeklyQuests(config.userId)
        ]);
        stopSpinner(spinner, slowTimer);
        const dailyTable = new Table({ head: [' ', 'Quest', 'Reward', 'Progress'] });
        daily.forEach((q) => dailyTable.push(formatQuestRow(q)));
        const weeklyTable = new Table({ head: [' ', chalk.magenta('Boss Quest'), 'Reward', 'Progress'] });
        weekly.forEach((q) => weeklyTable.push(formatQuestRow(q)));
        console.log(boxen(`${chalk.yellow('🗡️ Daily Quests')} (${timeUntilReset()})\n${dailyTable.toString()}\n\n${chalk.magenta('⚔️ Weekly Bosses')}\n${weeklyTable.toString()}\n\n${chalk.gray('Progress auto-updates from your GitHub pushes, PRs, reviews, and issues.')}`, {
            padding: 1,
            borderColor: 'yellow'
        }));
    }
    catch (err) {
        stopSpinner(spinner, slowTimer, 'fail', 'Could not load quests');
        console.error(chalk.red(formatErrorMessage(err)));
    }
}
