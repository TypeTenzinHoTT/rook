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
export async function getCraftingRecipes() {
    const stats = await getUserStats(getConfig()?.userId || '');
    return stats.craftingRecipes || [];
}
export async function craft(recipeCode) {
    const config = getConfig();
    if (!config)
        throw new Error('Not logged in');
    const client = createClient();
    const { data } = await client.post(`/crafting/${config.userId}/craft/${recipeCode}`);
    return data;
}
export async function saveNotificationIntegration(type, webhookUrl) {
    const config = getConfig();
    if (!config)
        throw new Error('Not logged in');
    const client = createClient();
    const { data } = await client.post(`/notifications/${config.userId}/integrations`, { type, webhookUrl });
    return data;
}
export async function listNotificationIntegrations() {
    const config = getConfig();
    if (!config)
        throw new Error('Not logged in');
    const client = createClient();
    const { data } = await client.get(`/notifications/${config.userId}/integrations`);
    return data;
}
export async function createGuild(name) {
    const config = getConfig();
    if (!config)
        throw new Error('Not logged in');
    const client = createClient();
    const { data } = await client.post(`/guilds/create`, { name, userId: config.userId });
    return data;
}
export async function joinGuild(name) {
    const config = getConfig();
    if (!config)
        throw new Error('Not logged in');
    const client = createClient();
    const { data } = await client.post(`/guilds/join`, { name, userId: config.userId });
    return data;
}
export async function leaveGuild() {
    const config = getConfig();
    if (!config)
        throw new Error('Not logged in');
    const client = createClient();
    const { data } = await client.post(`/guilds/leave`, { userId: config.userId });
    return data;
}
export async function inviteToGuild(targetUsername) {
    const config = getConfig();
    if (!config)
        throw new Error('Not logged in');
    const client = createClient();
    const { data } = await client.post(`/guilds/invite`, { userId: config.userId, targetUsername });
    return data;
}
export async function getGuildStats() {
    const config = getConfig();
    if (!config)
        throw new Error('Not logged in');
    const client = createClient();
    const { data } = await client.get(`/guilds/user/${config.userId}`);
    return data;
}
export async function prestige() {
    const config = getConfig();
    if (!config)
        throw new Error('Not logged in');
    const client = createClient();
    const { data } = await client.post(`/users/${config.userId}/prestige`, { level: undefined });
    return data;
}
