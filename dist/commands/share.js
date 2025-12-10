import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { getConfig, isLoggedIn } from '../lib/config.js';
import { shareAchievement, getUserStats } from '../lib/api.js';
import { getLevelTitle, xpProgress } from '../lib/xp.js';
function guardLogin() {
    if (!isLoggedIn()) {
        console.log(chalk.red('You are not logged in. Run ') + chalk.cyan('rook login') + chalk.red(' first.'));
        process.exit(1);
    }
}
function pickPlatform(opts) {
    if (opts.twitter)
        return 'twitter';
    if (opts.discord)
        return 'discord';
    if (opts.slack)
        return 'slack';
    return 'link';
}
export async function share(target, achievementId, opts = {}) {
    guardLogin();
    const config = getConfig();
    if (!config)
        return;
    const platform = pickPlatform(opts);
    if (target === 'achievement') {
        if (!achievementId) {
            console.error(chalk.red('Usage: rook share achievement <id>'));
            return;
        }
        const spinner = ora('Forging shareable achievement...').start();
        try {
            const result = await shareAchievement(config.userId, achievementId, platform);
            spinner.succeed('Achievement ready to share!');
            console.log(boxen(`${chalk.green('Share this:')}\n${result.url}`, { padding: 1, borderColor: 'green' }));
        }
        catch (err) {
            spinner.fail('Could not share achievement');
            console.error(chalk.red(err?.message || err));
        }
        return;
    }
    if (target === 'stats') {
        const spinner = ora('Gathering your legend...').start();
        try {
            const stats = await getUserStats(config.userId);
            spinner.stop();
            const progress = xpProgress(stats.totalXp);
            const title = getLevelTitle(progress.level);
            const ascii = `
/\\  ROOK //\\
|| Level ${progress.level} ${title}
|| XP ${stats.totalXp} | Streak ${stats.streak} days
\\// Achievements ${stats.achievements.length}
`;
            console.log(boxen(`${chalk.green('Shareable stats ready!')}\nPlatform: ${platform}\n\n${ascii}`, {
                padding: 1,
                borderColor: 'cyan'
            }));
        }
        catch (err) {
            spinner.fail('Could not prepare stats');
            console.error(chalk.red(err?.message || err));
        }
        return;
    }
    console.error(chalk.red('Unknown share target. Use "achievement" or "stats".'));
}
