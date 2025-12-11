import { applyXp, calculateLevel, ensureUserStats } from './progression.js';
import { getQuestStreak, maybeGrantQuestStreakDrop } from './questStreak.js';
import { awardRandomLoot } from './loot.js';
import { getGuildXpMultiplier } from './guilds.js';
import { getPrestigeXpMultiplier, maybeGrantPrestigeDrops } from './prestige.js';
import { notifyLevelUp } from './notifications.js';

export async function applyXpWithBonuses(pool, { userId, amount, reason, activityType, io, context = {} }) {
  await ensureUserStats(pool, userId);
  const { rows: currentRows } = await pool.query('SELECT total_xp FROM user_stats WHERE user_id=$1', [userId]);
  const prevTotal = currentRows[0]?.total_xp || 0;
  const prevLevel = calculateLevel(prevTotal);

  const questStreak = await getQuestStreak(pool, userId);
  const questMultiplier = questStreak.effects.xpMultiplier || 1;
  const guildMultiplier = await getGuildXpMultiplier(pool, userId);
  const prestigeMultiplier = await getPrestigeXpMultiplier(pool, userId);

  const baseAmount = Number(amount) || 0;
  const totalMultiplier = questMultiplier * guildMultiplier * prestigeMultiplier;
  const appliedXp = Math.round(baseAmount * totalMultiplier);

  const result = await applyXp(pool, {
    userId,
    amount: appliedXp,
    reason,
    activityType,
    io,
    context: { ...context, questStreak: questStreak.questStreak, questStreakBonus: questStreak.questStreakBonus }
  });

  const newLevel = result.level;
  if (newLevel > prevLevel) {
    await notifyLevelUp(pool, { userId, level: newLevel, reason });
  }

  if (questStreak.effects.extraLootDrops) {
    for (let i = 0; i < questStreak.effects.extraLootDrops; i++) {
      await awardRandomLoot(pool, userId, io);
    }
  }
  await maybeGrantQuestStreakDrop(pool, { userId, streak: questStreak.questStreak, io });
  await maybeGrantPrestigeDrops(pool, { userId, io });

  return {
    ...result,
    baseXp: baseAmount,
    appliedXp,
    xpMultiplier: totalMultiplier,
    questStreak: questStreak.questStreak,
    questStreakBonus: questStreak.questStreakBonus
  };
}
