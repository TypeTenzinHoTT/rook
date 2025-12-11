import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';
import { getConfig, isLoggedIn } from '../lib/config.js';
import { getUserStats, getRecentActivity } from '../lib/api.js';
import { getLevelTitle, progressBar, xpProgress } from '../lib/xp.js';
import { Achievement, UserStats } from '../types/index.js';
import { startSpinnerWithSlowNotice, stopSpinner, formatErrorMessage } from '../lib/ui.js';

function guardLogin() {
  if (!isLoggedIn()) {
    console.log(chalk.red('You are not logged in. Run ') + chalk.cyan('rook login') + chalk.red(' first.'));
    process.exit(1);
  }
}

function formatAchievements(achievements: Achievement[]) {
  const rarityColor: Record<Achievement['rarity'], (val: string) => string> = {
    common: chalk.gray,
    rare: chalk.cyan,
    epic: chalk.magenta,
    legendary: chalk.yellowBright
  };
  const recent = achievements.slice(-3).reverse();
  if (!recent.length) return 'No achievements yet. Push some code to start unlocking!';
  return recent
    .map((a) => {
      const colored = (rarityColor[a.rarity] || ((v: string) => v))(a.name);
      return `${a.icon || '🏆'}  ${chalk.bold(colored)} - ${chalk.gray(a.description)}`;
    })
    .join('\n');
}

export async function stats() {
  guardLogin();
  const config = getConfig();
  if (!config) return;

  const { spinner, slowTimer } = startSpinnerWithSlowNotice('Summoning your hero sheet...');
  try {
    const data: UserStats = await getUserStats(config.userId);
    const activity = (data as any).recentActivity || (await getRecentActivity(config.userId, 5));
    stopSpinner(spinner, slowTimer);

    const progress = xpProgress(data.totalXp);
    const title = getLevelTitle(progress.level);
    const achievements = data.achievements || [];
    const loot = (data as any).recentLoot || [];
    const streakLine =
      data.streak > 0
        ? `${chalk.red('🔥 Streak:')} ${data.streak} days ${chalk.gray('(keep it alive until UTC midnight)')}`
        : `${chalk.gray('No streak yet — earn XP today to start your flame.')}`;

    const header = gradient.rainbow.multiline(` ${config.username} `);

    const lines = [
      `${chalk.cyan('Level')} ${progress.level} ${chalk.gray('(' + title + ')')}`,
      `${progressBar(progress.current, progress.needed)} ${progress.percentage}%`,
      `${chalk.yellow('Total XP:')} ${data.totalXp}`,
      streakLine,
      `${chalk.green('Achievements:')} ${achievements.length}`,
      '',
      chalk.bold('Recent achievements:'),
      formatAchievements(achievements),
      '',
      chalk.bold('Recent XP:'),
      activity && activity.length
        ? activity
            .map((act: any) => `${chalk.green('+' + act.amount)} XP for ${chalk.white(act.reason || act.activity_type || 'activity')} (${chalk.gray(new Date(act.created_at).toLocaleString())})`)
            .join('\n')
        : 'No recent activity yet.',
      '',
      chalk.bold('Recent Loot:'),
      loot && loot.length
        ? loot
            .map((l: any) => `${chalk.green('+1')} ${l.icon || '🎁'} ${chalk.white(l.name)} ${chalk.gray('(now x' + (l.quantity || 1) + ')')}`)
            .join('\n')
        : 'No loot drops yet. Earn XP to get rewards!'
    ];

    console.log(
      boxen(`${header}\n\n${lines.join('\n')}`, {
        padding: 1,
        borderColor: 'cyan',
        title: `${chalk.blue('📊 Stats')}`
      })
    );
    if (data.coachTip) {
      console.log(chalk.magenta(`Coach says: ${data.coachTip}`));
    }
  } catch (err: any) {
    stopSpinner(spinner, slowTimer, 'fail', 'Could not fetch stats');
    console.error(chalk.red(formatErrorMessage(err)));
  }
}
