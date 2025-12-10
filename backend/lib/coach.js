import { ensureDailyQuests, ensureWeeklyQuests } from './quests.js';

export async function generateCoachTip({ pool, userId, username }) {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const fetchFn =
      typeof fetch !== 'undefined'
        ? fetch
        : (...args) => import('node-fetch').then(({ default: f }) => f(...args));

    const [{ rows: xpRows }, daily, weekly, stats] = await Promise.all([
      pool.query('SELECT amount, reason, activity_type, created_at FROM xp_activity WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5', [userId]),
      ensureDailyQuests(pool, userId),
      ensureWeeklyQuests(pool, userId),
      pool.query('SELECT total_xp, streak FROM user_stats WHERE user_id=$1', [userId])
    ]);

    const dailyIncomplete = daily.filter((q) => !q.completed).map((q) => `${q.title} (${q.progress_current || 0}/${q.progress_total})`);
    const weeklyIncomplete = weekly.filter((q) => !q.completed).map((q) => `${q.title} (${q.progress_current || 0}/${q.progress_total})`);

    const prompt = `You are a playful roguelike coach for developers. Provide ONE short actionable tip.
User: ${username}
Level-ish XP: ${stats.rows[0]?.total_xp || 0}, Streak: ${stats.rows[0]?.streak || 0}
Daily quests remaining: ${dailyIncomplete.join('; ') || 'none'}
Weekly quests remaining: ${weeklyIncomplete.join('; ') || 'none'}
Recent XP: ${xpRows
      .map((r) => `${r.amount} for ${r.reason || r.activity_type || 'activity'}`)
      .join('; ') || 'none'}
Reply with a single sentence, keep it fun, <= 25 words, add one emoji.`;

    const response = await fetchFn('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        max_tokens: 60,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[coach] OpenAI error', text);
      return null;
    }

    const data = await response.json();
    const tip = data?.choices?.[0]?.message?.content?.trim();
    return tip || null;
  } catch (err) {
    console.error('[coach] tip generation failed', err);
    return null;
  }
}
