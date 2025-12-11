import axios from 'axios';
import { getConfig } from './config.js';
function createClient() {
    const config = getConfig();
    const apiUrl = config?.apiUrl || process.env.ROOK_API_URL || 'http://localhost:4000/api';
    const headers = {};
    if (config?.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
    }
    return axios.create({
        baseURL: apiUrl,
        headers,
        timeout: 5000
    });
}
export async function getUserStats(userId) {
    const client = createClient();
    const { data } = await client.get(`/users/${userId}/stats`);
    return data;
}
export async function awardXP(userId, amount, reason) {
    const client = createClient();
    const { data } = await client.post(`/users/${userId}/xp`, { amount, reason });
    return data;
}
export async function getDailyQuests(userId) {
    const client = createClient();
    const { data } = await client.get(`/users/${userId}/quests/daily`);
    return data;
}
export async function getWeeklyQuests(userId) {
    const client = createClient();
    const { data } = await client.get(`/users/${userId}/quests/weekly`);
    return data;
}
export async function completeQuest(userId, questId) {
    const client = createClient();
    const { data } = await client.post(`/users/${userId}/quests/${questId}/complete`);
    return data;
}
export async function getGlobalLeaderboard(limit = 10, page = 1) {
    const client = createClient();
    const { data } = await client.get(`/leaderboard/global`, { params: { limit, page } });
    return data;
}
export async function getFriendsLeaderboard(userId) {
    const client = createClient();
    const { data } = await client.get(`/users/${userId}/leaderboard/friends`);
    return data;
}
export async function getFriends(userId) {
    const client = createClient();
    const { data } = await client.get(`/users/${userId}/friends`);
    return data;
}
export async function addFriend(userId, friendUsername) {
    const client = createClient();
    const { data } = await client.post(`/users/${userId}/friends`, { username: friendUsername });
    return data;
}
export async function removeFriend(userId, friendId) {
    const client = createClient();
    const { data } = await client.delete(`/users/${userId}/friends/${friendId}`);
    return data;
}
export async function registerUser(githubId, username, token) {
    const client = createClient();
    const { data } = await client.post(`/users/register`, { githubId, username, token });
    return data;
}
export async function shareAchievement(userId, achievementId, platform) {
    const client = createClient();
    const { data } = await client.post(`/users/${userId}/achievements/${achievementId}/share`, { platform });
    return data;
}
export async function getRecentActivity(userId, limit = 5) {
    const client = createClient();
    const { data } = await client.get(`/users/${userId}/activity`, { params: { limit } });
    return data;
}
export async function getXpHistory(userId, limit = 20) {
    const client = createClient();
    const { data } = await client.get(`/users/${userId}/xp`, { params: { limit } });
    return data;
}
export async function connectWebhook(repoFullName, token) {
    const client = createClient();
    const { data } = await client.post(`/github/webhooks`, { repoFullName, token });
    return data;
}
export async function getInventory(userId) {
    const client = createClient();
    const { data } = await client.get(`/users/${userId}/loot`);
    return data.inventory || [];
}
