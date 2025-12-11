import axios, { AxiosInstance } from 'axios';
import { getConfig } from './config.js';
import { Achievement, LeaderboardEntry, Quest, UserStats, XPActivity, LootItem, CraftingRecipe, GuildSummary, PrestigeSummary } from '../types/index.js';

function createClient(): AxiosInstance {
  const config = getConfig();
  const apiUrl = config?.apiUrl || process.env.ROOK_API_URL || 'http://localhost:4000/api';
  const headers: Record<string, string> = {};
  if (config?.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }
  return axios.create({
    baseURL: apiUrl,
    headers,
    timeout: 5000
  });
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const client = createClient();
  const { data } = await client.get(`/users/${userId}/stats`);
  return data;
}

export async function awardXP(userId: string, amount: number, reason?: string) {
  const client = createClient();
  const { data } = await client.post(`/users/${userId}/xp`, { amount, reason });
  return data;
}

export async function getDailyQuests(userId: string): Promise<Quest[]> {
  const client = createClient();
  const { data } = await client.get(`/users/${userId}/quests/daily`);
  return data;
}

export async function getWeeklyQuests(userId: string): Promise<Quest[]> {
  const client = createClient();
  const { data } = await client.get(`/users/${userId}/quests/weekly`);
  return data;
}

export async function completeQuest(userId: string, questId: string) {
  const client = createClient();
  const { data } = await client.post(`/users/${userId}/quests/${questId}/complete`);
  return data;
}

export async function getGlobalLeaderboard(limit = 10, page = 1): Promise<LeaderboardEntry[]> {
  const client = createClient();
  const { data } = await client.get(`/leaderboard/global`, { params: { limit, page } });
  return data;
}

export async function getFriendsLeaderboard(userId: string): Promise<LeaderboardEntry[]> {
  const client = createClient();
  const { data } = await client.get(`/users/${userId}/leaderboard/friends`);
  return data;
}

export async function getFriends(userId: string) {
  const client = createClient();
  const { data } = await client.get(`/users/${userId}/friends`);
  return data;
}

export async function addFriend(userId: string, friendUsername: string) {
  const client = createClient();
  const { data } = await client.post(`/users/${userId}/friends`, { username: friendUsername });
  return data;
}

export async function removeFriend(userId: string, friendId: string) {
  const client = createClient();
  const { data } = await client.delete(`/users/${userId}/friends/${friendId}`);
  return data;
}

export async function registerUser(githubId: string, username: string, token: string) {
  const client = createClient();
  const { data } = await client.post(`/users/register`, { githubId, username, token });
  return data;
}

export async function shareAchievement(userId: string, achievementId: string, platform: string) {
  const client = createClient();
  const { data } = await client.post(`/users/${userId}/achievements/${achievementId}/share`, { platform });
  return data as { url: string };
}

export async function getRecentActivity(userId: string, limit = 5) {
  const client = createClient();
  const { data } = await client.get(`/users/${userId}/activity`, { params: { limit } });
  return data;
}

export async function getXpHistory(userId: string, limit = 20): Promise<XPActivity[]> {
  const client = createClient();
  const { data } = await client.get(`/users/${userId}/xp`, { params: { limit } });
  return data;
}

export async function connectWebhook(repoFullName: string, token: string) {
  const client = createClient();
  const { data } = await client.post(`/github/webhooks`, { repoFullName, token });
  return data;
}

export async function getInventory(userId: string): Promise<LootItem[]> {
  const client = createClient();
  const { data } = await client.get(`/users/${userId}/loot`);
  return data.inventory || [];
}

export async function getCraftingRecipes(): Promise<CraftingRecipe[]> {
  const stats = await getUserStats(getConfig()?.userId || '');
  return stats.craftingRecipes || [];
}

export async function craft(recipeCode: string) {
  const config = getConfig();
  if (!config) throw new Error('Not logged in');
  const client = createClient();
  const { data } = await client.post(`/crafting/${config.userId}/craft/${recipeCode}`);
  return data;
}

export async function saveNotificationIntegration(type: 'slack' | 'discord', webhookUrl: string) {
  const config = getConfig();
  if (!config) throw new Error('Not logged in');
  const client = createClient();
  const { data } = await client.post(`/notifications/${config.userId}/integrations`, { type, webhookUrl });
  return data;
}

export async function listNotificationIntegrations() {
  const config = getConfig();
  if (!config) throw new Error('Not logged in');
  const client = createClient();
  const { data } = await client.get(`/notifications/${config.userId}/integrations`);
  return data;
}

export async function createGuild(name: string) {
  const config = getConfig();
  if (!config) throw new Error('Not logged in');
  const client = createClient();
  const { data } = await client.post(`/guilds/create`, { name, userId: config.userId });
  return data as { guildId: number };
}

export async function joinGuild(name: string) {
  const config = getConfig();
  if (!config) throw new Error('Not logged in');
  const client = createClient();
  const { data } = await client.post(`/guilds/join`, { name, userId: config.userId });
  return data as { guildId: number };
}

export async function leaveGuild() {
  const config = getConfig();
  if (!config) throw new Error('Not logged in');
  const client = createClient();
  const { data } = await client.post(`/guilds/leave`, { userId: config.userId });
  return data;
}

export async function inviteToGuild(targetUsername: string) {
  const config = getConfig();
  if (!config) throw new Error('Not logged in');
  const client = createClient();
  const { data } = await client.post(`/guilds/invite`, { userId: config.userId, targetUsername });
  return data;
}

export async function getGuildStats(): Promise<GuildSummary | null> {
  const config = getConfig();
  if (!config) throw new Error('Not logged in');
  const client = createClient();
  const { data } = await client.get(`/guilds/user/${config.userId}`);
  return data;
}

export async function prestige(): Promise<PrestigeSummary> {
  const config = getConfig();
  if (!config) throw new Error('Not logged in');
  const client = createClient();
  const { data } = await client.post(`/users/${config.userId}/prestige`, { level: undefined });
  return data;
}
