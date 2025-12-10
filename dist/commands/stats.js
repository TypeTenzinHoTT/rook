import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';
import ora from 'ora';
import { getConfig, isLoggedIn } from '../lib/config.js';
import { getUserStats, getRecentActivity } from '../lib/api.js';
import { getLevelTitle, progressBar, xpProgress } from '../lib/xp.js';
function guardLogin() {
    if (!isLoggedIn()) {
        console.log(chalk.red('You are not logged in. Run ') + chalk.cyan('rook login') + chalk.red(' first.'));
        process.exit(1);
    }
}
function formatAchievements(achievements) {
    const recent = achievements.slice(-3).reverse();
    if (!recent.length)
        return 'No achievements yet. Push some code to start unlocking!';
    return recent
        .map((a) => `${a.icon || '🏆'}  ${chalk.bold(a.name)} - ${chalk.gray(a.description)}`)
        .join('\n');
}
export async function stats() {
    guardLogin();
    const config = getConfig();
    if (!config)
        return;
    const spinner = ora('Summoning your hero sheet...').start();
    try {
        const data = await getUserStats(config.userId);
        const activity = await getRecentActivity(config.userId, 5);
        spinner.stop();
        const progress = xpProgress(data.totalXp);
        const title = getLevelTitle(progress.level);
        const header = gradient.rainbow.multiline(` ${config.username} `);
        const lines = [
            `${chalk.cyan('Level')} ${progress.level} ${chalk.gray('(' + title + ')')}`,
            `${progressBar(progress.current, progress.needed)} ${progress.percentage}%`,
            `${chalk.yellow('Total XP:')} ${data.totalXp}    ${chalk.red('🔥 Streak:')} ${data.streak} days`,
            `${chalk.green('Achievements:')} ${data.achievements.length}`,
            '',
            chalk.bold('Recent achievements:'),
            formatAchievements(data.achievements),
            '',
            chalk.bold('Recent XP:'),
            activity && activity.length
                ? activity
                    .map((act) => `${chalk.green('+' + act.amount)} XP for ${chalk.white(act.reason || act.activity_type || 'activity')} (${chalk.gray(new Date(act.created_at).toLocaleString())})`)
                    .join('\n')
                : 'No recent activity yet.'
        ];
        console.log(boxen(`${header}\n\n${lines.join('\n')}`, {
            padding: 1,
            borderColor: 'cyan',
            title: `${chalk.blue('📊 Stats')}`
        }));
    }
    catch (err) {
        spinner.fail('Could not fetch stats');
        console.error(chalk.red(err?.message || err));
    }
}
