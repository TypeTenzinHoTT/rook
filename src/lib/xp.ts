type Progress = {
  level: number;
  current: number;
  needed: number;
  percentage: number;
};

export function calculateLevel(totalXp: number): number {
  if (!Number.isFinite(totalXp) || totalXp < 0) {
    return 1;
  }
  return Math.floor(Math.sqrt(totalXp / 1000)) + 1;
}

export function xpForNextLevel(currentLevel: number): number {
  const level = Math.max(1, currentLevel);
  const currentThreshold = Math.pow(level - 1, 2) * 1000;
  const nextThreshold = Math.pow(level, 2) * 1000;
  return nextThreshold - currentThreshold;
}

export function xpProgress(totalXp: number): Progress {
  const level = calculateLevel(totalXp);
  const levelStart = Math.pow(level - 1, 2) * 1000;
  const nextLevel = Math.pow(level, 2) * 1000;
  const current = Math.max(0, totalXp - levelStart);
  const needed = nextLevel - levelStart;
  const percentage = needed === 0 ? 100 : Math.min(100, Math.max(0, (current / needed) * 100));
  return { level, current, needed, percentage: Math.round(percentage) };
}

export function getLevelTitle(level: number): string {
  if (level >= 30) return 'Legendary Architect';
  if (level >= 25) return 'Mythic Innovator';
  if (level >= 20) return 'Master Developer';
  if (level >= 15) return 'Senior Spellcaster';
  if (level >= 10) return 'Battle-Hardened Coder';
  if (level >= 5) return 'Apprentice Debugger';
  return 'Rookie Adventurer';
}

export function progressBar(current: number, total: number, width = 24): string {
  if (total <= 0) return '[................] 0%';
  const clamped = Math.max(0, Math.min(current, total));
  const filled = Math.round((clamped / total) * width);
  const empty = Math.max(0, width - filled);
  const bar = `${'='.repeat(filled)}${'-'.repeat(empty)}`;
  const pct = Math.round((clamped / total) * 100);
  return `[${bar}] ${pct}%`;
}

export function calculateStreak(lastActive: string | Date, currentStreak: number): number {
  const last = new Date(lastActive);
  if (Number.isNaN(last.getTime())) return Math.max(0, currentStreak);

  const today = new Date();
  const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const startOfLast = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate()));
  const diffDays = Math.floor((startOfToday.getTime() - startOfLast.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return currentStreak; // already active today
  if (diffDays === 1) return currentStreak + 1; // continued streak
  return 1; // reset streak starting today
}
