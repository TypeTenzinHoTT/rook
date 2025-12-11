import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';
import { getConfig, isLoggedIn } from '../lib/config.js';
import { getUserStats, getRecentActivity } from '../lib/api.js';
import { getLevelTitle, progressBar, xpProgress } from '../lib/xp.js';
import { Achievement, UserStats } from '../types/index.js';
import { startSpinnerWithSlowNotice, stopSpinner, formatErrorMessage, maybeShowTip } from '../lib/ui.js';

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
    const questStreakLine =
      data.questStreak && data.questStreak > 0
        ? `${chalk.red('🔥 Quest Streak:')} ${data.questStreak} days ${data.questStreakBonus ? chalk.gray('(' + data.questStreakBonus + ')') : ''}`
        : chalk.gray('Complete all daily quests to start a quest streak.');
    const craftingLine = data.crafting
      ? `${chalk.magenta('🛠️ Crafting Level:')} ${data.crafting.level || data.craftingLevel || 1} (${data.crafting.xp || data.craftingXp || 0} XP)`
      : '';
    const craftingPerks = data.crafting?.perks?.length ? `Perks: ${data.crafting.perks.join(', ')}` : '';
    const luckLine = `${chalk.green('🍀 Luck Meter:')} ${data.luckMeter || 0}${
      data.luckMeter ? chalk.gray(` (+${((data.luckMeter || 0) * 0.5).toFixed(1)}% rare drop chance)`) : ''
    }`;
    const guildName = typeof data.guild === 'string' ? data.guild : data.guild?.name;
    const guildBonus = typeof data.guild === 'object' && data.guild ? (data.guild as any).bonus : 0;
    const guildLine = data.guild ? `${chalk.cyan('🏰 Guild:')} ${guildName || 'Guild'} — +${Math.round((guildBonus || 0) * 100)}% XP` : '';
    const prestigeLine =
      data.prestige && typeof data.prestige.count === 'number'
        ? `${chalk.yellow('🏅 Prestige:')} ${data.prestige.count} ${chalk.gray('(' + (data.prestige.perkSummary || '') + ')')}`
        : '';

    const header = gradient.rainbow.multiline(` ${config.username} `);

    const lines = [
      `${chalk.cyan('Level')} ${progress.level} ${chalk.gray('(' + title + ')')}`,
      `${progressBar(progress.current, progress.needed)} ${progress.percentage}%`,
      `${chalk.yellow('Total XP:')} ${data.totalXp}`,
      streakLine,
      questStreakLine,
      guildLine,
      prestigeLine,
      craftingLine,
      craftingPerks,
      luckLine,
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
        : 'No loot drops yet. Earn XP to get rewards!',
      '',
      chalk.bold('PR Battles:'),
      data.prBattles && data.prBattles.length
        ? data.prBattles
            .map((b: any) => `- vs ${b.opponent} — ${b.status || 'pending'}`)
            .join('\n')
        : chalk.gray('No battles at the moment.')
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
    if (data.craftingRecipes && data.craftingRecipes.length) {
      console.log('\n  Craftable Items:');
      data.craftingRecipes.forEach((recipe: any) => {
        const ingredients = recipe.ingredients.map((ing: any) => `${ing.qty}x ${ing.name}`).join(', ');
        console.log(`  - ${recipe.result.icon || '🎁'} ${recipe.name} — requires ${ingredients}`);
      });
    }
  } catch (err: any) {
    stopSpinner(spinner, slowTimer, 'fail', 'Could not fetch stats');
    console.error(chalk.red(formatErrorMessage(err)));
  } finally {
    maybeShowTip();
  }
}
