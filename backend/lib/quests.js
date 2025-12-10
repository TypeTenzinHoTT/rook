import { applyXp, ensureUserStats } from './progression.js';

export const DAILY_QUESTS = [
  { title: 'Make 3 commits', description: 'Push code to earn XP', xp_reward: 150, progress_total: 3 },
  { title: 'Open 1 PR', description: 'Open a pull request', xp_reward: 100, progress_total: 1 },
  { title: 'Review 2 PRs', description: 'Give feedback to peers', xp_reward: 150, progress_total: 2 },
  { title: 'Close 1 issue', description: 'Close an issue', xp_reward: 100, progress_total: 1 },
  { title: 'Maintain your streak', description: 'Stay active today', xp_reward: 50, progress_total: 1 }
];

export const WEEKLY_QUESTS = [
  { title: 'Make 20 commits this week', description: 'Stay consistent', xp_reward: 500, progress_total: 20 },
  { title: 'Merge 3 PRs this week', description: 'Ship features', xp_reward: 600, progress_total: 3 },
  { title: 'Earn 1000 XP this week', description: 'Go big or go home', xp_reward: 1000, progress_total: 1000 }
];

const WEEKLY_TYPE = 'boss'; // store as boss going forward while still supporting legacy 'weekly'

export async function ensureDailyQuests(pool, userId) {
  const { rows } = await pool.query('SELECT * FROM daily_quests WHERE user_id=$1 AND created_at = CURRENT_DATE AND type=$2', [userId, 'daily']);
  if (rows.length) return rows;
  const inserts = await Promise.all(
    DAILY_QUESTS.map((q) =>
      pool.query(
        'INSERT INTO daily_quests (user_id, title, description, type, xp_reward, progress_total, progress_current) VALUES ($1,$2,$3,$4,$5,$6,0) RETURNING *',
        [userId, q.title, q.description, 'daily', q.xp_reward, q.progress_total]
      )
    )
  );
  return inserts.map((r) => r.rows[0]);
}

export async function ensureWeeklyQuests(pool, userId) {
  const { rows } = await pool.query(
    "SELECT * FROM daily_quests WHERE user_id=$1 AND type IN ('boss','weekly') AND created_at >= date_trunc('week', CURRENT_DATE)",
    [userId]
  );
  if (rows.length) return rows;
  const inserts = await Promise.all(
    WEEKLY_QUESTS.map((q) =>
      pool.query(
        'INSERT INTO daily_quests (user_id, title, description, type, xp_reward, progress_total, progress_current, created_at) VALUES ($1,$2,$3,$4,$5,$6,0,CURRENT_DATE) RETURNING *',
        [userId, q.title, q.description, WEEKLY_TYPE, q.xp_reward, q.progress_total]
      )
    )
  );
  return inserts.map((r) => r.rows[0]);
}

async function fetchQuest(pool, userId, title, type) {
  if (type === 'daily') {
    const { rows } = await pool.query(
      'SELECT * FROM daily_quests WHERE user_id=$1 AND title=$2 AND type=$3 AND created_at = CURRENT_DATE LIMIT 1',
      [userId, title, 'daily']
    );
    return rows[0];
  }
  const { rows } = await pool.query(
    "SELECT * FROM daily_quests WHERE user_id=$1 AND title=$2 AND type IN ('boss','weekly') AND created_at >= date_trunc('week', CURRENT_DATE) ORDER BY created_at DESC LIMIT 1",
    [userId, title]
  );
  return rows[0];
}

async function isDailyBoardCleared(pool, userId) {
  const { rows } = await pool.query(
    "SELECT COUNT(*) AS remaining FROM daily_quests WHERE user_id=$1 AND type='daily' AND created_at = CURRENT_DATE AND completed=false",
    [userId]
  );
  return Number(rows[0]?.remaining || 0) === 0;
}

async function isWeeklyBoardCleared(pool, userId) {
  const { rows } = await pool.query(
    "SELECT COUNT(*) AS remaining FROM daily_quests WHERE user_id=$1 AND type IN ('boss','weekly') AND created_at >= date_trunc('week', CURRENT_DATE) AND completed=false",
    [userId]
  );
  return Number(rows[0]?.remaining || 0) === 0;
}

export async function updateQuestProgress(pool, { userId, title, increment = 1, type = 'daily', io, trackXpReward = false }) {
  await ensureUserStats(pool, userId);
  if (type === 'daily') {
    await ensureDailyQuests(pool, userId);
  } else {
    await ensureWeeklyQuests(pool, userId);
  }
  const quest = await fetchQuest(pool, userId, title, type);
  if (!quest) return null;
  if (quest.completed) return quest;

  const newProgress = Math.min((quest.progress_current || 0) + increment, quest.progress_total);
  if (newProgress !== quest.progress_current) {
    await pool.query('UPDATE daily_quests SET progress_current=$1 WHERE id=$2', [newProgress, quest.id]);
  }

  if (newProgress >= quest.progress_total && !quest.completed) {
    await pool.query('UPDATE daily_quests SET completed=true WHERE id=$1', [quest.id]);
    let context = {};
    if (type === 'daily') {
      context.dailyClearedToday = await isDailyBoardCleared(pool, userId);
    } else {
      context.weeklyClearedThisWeek = await isWeeklyBoardCleared(pool, userId);
    }
    const result = await applyXp(pool, {
      userId,
      amount: quest.xp_reward,
      reason: quest.title,
      activityType: 'quest',
      io,
      context
    });
    if (trackXpReward && title !== 'Earn 1000 XP this week') {
      await updateWeeklyXpQuest(pool, { userId, increment: quest.xp_reward, io });
    }
    return { ...quest, progress_current: newProgress, completed: true, streak: result.streak };
  }

  return { ...quest, progress_current: newProgress };
}

export async function completeMaintainQuest(pool, { userId, streak, io }) {
  if (!streak || streak <= 0) return;
  await ensureDailyQuests(pool, userId);
  const quest = await fetchQuest(pool, userId, 'Maintain your streak', 'daily');
  if (!quest || quest.completed) return;
  await pool.query('UPDATE daily_quests SET progress_current=$1, completed=true WHERE id=$2', [1, quest.id]);
  const context = { dailyClearedToday: await isDailyBoardCleared(pool, userId) };
  await applyXp(pool, { userId, amount: quest.xp_reward, reason: quest.title, activityType: 'quest', io, context });
}

export async function updateWeeklyXpQuest(pool, { userId, increment, io }) {
  if (!increment) return;
  await updateQuestProgress(pool, { userId, title: 'Earn 1000 XP this week', increment, type: 'weekly', io, trackXpReward: false });
}
