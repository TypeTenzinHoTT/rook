export interface Config {
  token: string;
  username: string;
  userId: string;
  apiUrl: string;
}

export interface UserStats {
  userId: string;
  username: string;
  level: number;
  currentXp: number;
  totalXp: number;
  streak: number;
  lastActive: string;
  achievements: Achievement[];
  rank?: number;
  guild?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  type: 'daily' | 'weekly' | 'boss';
  completed: boolean;
  progress?: { current: number; total: number };
  deadline?: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  level: number;
  totalXp: number;
  achievements: number;
  streak: number;
}

export const XP_VALUES = {
  COMMIT: 50,
  COMMIT_LARGE: 100,
  PR_CREATED: 100,
  PR_MERGED: 200,
  PR_REVIEWED: 75,
  ISSUE_CLOSED: 100,
  ISSUE_CREATED: 25,
  STAR_RECEIVED: 10,
  DAILY_STREAK: 50
};
