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
  coachTip?: string | null;
  rank?: number;
  guild?: string | GuildSummary | null;
  questStreak?: number;
  questStreakBonus?: string;
  crafting?: CraftingSkill;
  craftingLevel?: number;
  craftingXp?: number;
  luckMeter?: number;
  prBattles?: PRBattle[];
  prestige?: PrestigeSummary;
  recentActivity?: XPActivity[];
  recentLoot?: LootDrop[];
  craftingRecipes?: CraftingRecipe[];
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

export interface XPActivity {
  amount: number;
  reason?: string;
  activity_type?: string;
  created_at: string;
}

export interface LootItem {
  itemId: number;
  code: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  quantity: number;
  createdAt?: string;
}

export type LootDrop = LootItem;

export interface CraftingRecipe {
  code: string;
  name: string;
  description: string;
  ingredients: {
    itemId: number;
    code: string;
    name: string;
    qty: number;
  }[];
  result: {
    itemId: number;
    code: string;
    name: string;
    icon: string;
  };
}

export interface CraftingSkill {
  level: number;
  xp: number;
  perks?: string[];
}

export interface GuildSummary {
  id?: number;
  name?: string;
  members?: number;
  active?: number;
  bonus?: number;
  multiplier?: number;
}

export interface PRBattle {
  opponent: string;
  status: string;
  you?: { prNumber?: number; reviewed?: boolean };
  them?: { prNumber?: number; reviewed?: boolean };
  battleId?: number;
}

export interface PrestigeSummary {
  count: number;
  perks: {
    xpBonus: number;
    rareDaily: number;
    craftingDiscount: number;
  };
  perkSummary?: string;
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
