import axios, { AxiosInstance } from 'axios';
import { getConfig } from './config.js';
import { Achievement, LeaderboardEntry, Quest, UserStats, XPActivity } from '../types/index.js';

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
