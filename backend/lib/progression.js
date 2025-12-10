export function calculateLevel(totalXp) {
  return Math.floor(Math.sqrt(totalXp / 1000)) + 1;
}

export function calculateStreakUtc(lastActive, currentStreak) {
  if (!lastActive) return 1;
  const last = new Date(lastActive);
  if (Number.isNaN(last.getTime())) return 1;

  const today = new Date();
  const startToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const startLast = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate());
  const diffDays = Math.floor((startToday - startLast) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return currentStreak || 1;
  if (diffDays === 1) return (currentStreak || 0) + 1;
  return 1;
}

const ACHIEVEMENTS = [
  { code: 'FIRST_BLOOD', name: 'First Blood', description: 'Earn your first XP.', icon: '🩸', rarity: 'common' },
  { code: 'STREAK_3', name: 'On a Roll', description: 'Maintain a 3-day streak.', icon: '🔥', rarity: 'rare' },
  { code: 'STREAK_7', name: 'Streak Master', description: 'Maintain a 7-day streak.', icon: '🔥', rarity: 'epic' },
  { code: 'XP_1000', name: 'Grinding Hard', description: 'Reach 1000 total XP.', icon: '💪', rarity: 'epic' }
];

const achievementCache = new Map();

export async function seedAchievements(pool) {
  await Promise.all(
    ACHIEVEMENTS.map((a) =>
      pool.query(
        'INSERT INTO achievements (code, name, description, icon, rarity) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (code) DO NOTHING',
        [a.code, a.name, a.description, a.icon, a.rarity]
      )
    )
  );
}

async function getAchievement(pool, code) {
  if (achievementCache.has(code)) return achievementCache.get(code);
  const { rows } = await pool.query('SELECT id, code, name, description, icon, rarity FROM achievements WHERE code=$1', [code]);
  const record = rows[0];
  if (record) achievementCache.set(code, record);
  return record;
}

async function unlockAchievement(pool, userId, achievement) {
  const result = await pool.query(
    'INSERT INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES ($1,$2,NOW()) ON CONFLICT DO NOTHING RETURNING unlocked_at',
    [userId, achievement.id]
  );
  if (!result.rowCount) return null;
  const unlockedAt = result.rows[0]?.unlocked_at || new Date().toISOString();
  return {
    id: achievement.code,
    name: achievement.name,
    description: achievement.description,
    icon: achievement.icon,
    rarity: achievement.rarity,
    unlockedAt
  };
}

function shouldUnlock(code, prevTotal, newTotal, newStreak) {
  if (code === 'FIRST_BLOOD') return newTotal > 0;
  if (code === 'STREAK_3') return newStreak >= 3;
  if (code === 'STREAK_7') return newStreak >= 7;
  if (code === 'XP_1000') return newTotal >= 1000;
  return false;
}

export async function checkAndUnlockAchievements(pool, userId, prevTotal, newTotal, newStreak) {
  const unlocked = [];
  for (const item of ACHIEVEMENTS) {
    if (!shouldUnlock(item.code, prevTotal, newTotal, newStreak)) continue;
    const ach = await getAchievement(pool, item.code);
    if (!ach) continue;
    const result = await unlockAchievement(pool, userId, ach);
    if (result) unlocked.push(result);
  }
  return unlocked;
}

export async function ensureUserStats(pool, userId) {
  const { rows } = await pool.query('SELECT 1 FROM user_stats WHERE user_id=$1', [userId]);
  if (!rows.length) {
    await pool.query('INSERT INTO user_stats (user_id) VALUES ($1)', [userId]);
  }
}

export async function applyXp(pool, { userId, amount, reason, activityType, io }) {
  await ensureUserStats(pool, userId);
  const currentRes = await pool.query('SELECT total_xp, streak, last_active FROM user_stats WHERE user_id=$1', [userId]);
  const row = currentRes.rows[0] || { total_xp: 0, streak: 0, last_active: null };

  const newTotal = (row.total_xp || 0) + Number(amount);
  const newStreak = calculateStreakUtc(row.last_active, row.streak || 0);

  await pool.query('UPDATE user_stats SET total_xp=$1, streak=$2, last_active=NOW() WHERE user_id=$3', [newTotal, newStreak, userId]);
  await pool.query('INSERT INTO xp_activity (user_id, amount, reason, activity_type) VALUES ($1,$2,$3,$4)', [
    userId,
    amount,
    reason,
    activityType
  ]);

  const unlocked = await checkAndUnlockAchievements(pool, userId, row.total_xp || 0, newTotal, newStreak);

  io?.emit('leaderboard:update', { userId, totalXp: newTotal, delta: amount });

  return { totalXp: newTotal, streak: newStreak, level: calculateLevel(newTotal), unlocked };
}
