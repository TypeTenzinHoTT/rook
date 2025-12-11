import { awardLoot, loadLootTable, getRandomLoot } from './loot.js';

const BONUS_TIERS = [
  { streak: 30, xpMultiplier: 1.1, extraLootDrops: 1, guaranteedLegendary: true, guaranteedRare: true, label: 'guaranteed legendary drop once/day' },
  { streak: 14, xpMultiplier: 1.1, extraLootDrops: 1, guaranteedRare: true, label: 'guaranteed rare drop once/day' },
  { streak: 7, xpMultiplier: 1.1, extraLootDrops: 1, label: '+1 extra loot drop' },
  { streak: 3, xpMultiplier: 1.1, label: '+10% XP' },
  { streak: 1, xpMultiplier: 1.05, label: '+5% XP' }
];

function normalizeDate(d) {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function describeQuestStreakBonus(streak = 0) {
  const tier = BONUS_TIERS.find((t) => streak >= t.streak);
  if (!tier) return 'No active bonus';
  return tier.label;
}

export function getQuestStreakEffects(streak = 0) {
  const tier = BONUS_TIERS.find((t) => streak >= t.streak);
  return {
    streak,
    xpMultiplier: tier?.xpMultiplier || 1,
    extraLootDrops: tier?.extraLootDrops || 0,
    guaranteedRare: Boolean(tier?.guaranteedRare),
    guaranteedLegendary: Boolean(tier?.guaranteedLegendary),
    label: tier?.label || ''
  };
}

async function pickItemByRarity(pool, rarity) {
  const { rows } = await pool.query('SELECT id, name, ascii_icon, rarity FROM loot_items WHERE rarity=$1 ORDER BY drop_weight DESC LIMIT 1', [rarity]);
  if (rows.length) return rows[0];
  await loadLootTable(pool);
  return getRandomLoot({ forceRarity: rarity }) || getRandomLoot({ minRarity: rarity }) || null;
}

export async function updateQuestStreak(pool, userId) {
  const { rows } = await pool.query('SELECT quest_streak, last_quest_completed FROM user_stats WHERE user_id=$1', [userId]);
  const row = rows[0] || { quest_streak: 0, last_quest_completed: null };

  const todayUtc = normalizeDate(new Date());
  const last = row.last_quest_completed ? normalizeDate(row.last_quest_completed) : null;
  let questStreak = 1;

  if (last !== null) {
    const diffDays = Math.floor((todayUtc - last) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      questStreak = row.quest_streak || 1;
    } else if (diffDays === 1) {
      questStreak = (row.quest_streak || 0) + 1;
    }
  }

  await pool.query('UPDATE user_stats SET quest_streak=$1, last_quest_completed=CURRENT_DATE WHERE user_id=$2', [questStreak, userId]);
  return { questStreak, questStreakBonus: describeQuestStreakBonus(questStreak), effects: getQuestStreakEffects(questStreak) };
}

export async function getQuestStreak(pool, userId) {
  const { rows } = await pool.query('SELECT quest_streak FROM user_stats WHERE user_id=$1', [userId]);
  const questStreak = rows[0]?.quest_streak || 0;
  return { questStreak, questStreakBonus: describeQuestStreakBonus(questStreak), effects: getQuestStreakEffects(questStreak) };
}

async function hasBonusDropLogged(pool, userId, activityType) {
  const { rows } = await pool.query(
    'SELECT 1 FROM xp_activity WHERE user_id=$1 AND activity_type=$2 AND created_at::date = CURRENT_DATE LIMIT 1',
    [userId, activityType]
  );
  return rows.length > 0;
}

export async function maybeGrantQuestStreakDrop(pool, { userId, streak, io }) {
  if (!userId) return null;
  const current = streak !== undefined ? streak : (await getQuestStreak(pool, userId)).questStreak;
  if (current < 14) return null;

  const dropType = current >= 30 ? 'quest_streak_legendary' : 'quest_streak_rare';
  const rarity = current >= 30 ? 'legendary' : 'rare';
  if (await hasBonusDropLogged(pool, userId, dropType)) return null;

  const item = await pickItemByRarity(pool, rarity);
  if (!item) return null;
  const quantity = await awardLoot(pool, { userId, itemId: item.id });
  await pool.query('INSERT INTO xp_activity (user_id, amount, reason, activity_type) VALUES ($1,0,$2,$3)', [
    userId,
    `Quest streak bonus (${rarity})`,
    dropType
  ]);
  const payload = { userId, itemName: item.name, itemIcon: item.ascii_icon, quantity, rarity: item.rarity };
  io?.emit('loot', payload);
  return payload;
}
