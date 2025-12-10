import { Octokit } from 'octokit';
import { XP_VALUES } from '../types/index.js';
import { getConfig } from './config.js';

function getClient(): Octokit {
  const token = getConfig()?.token || process.env.GITHUB_TOKEN;
  return new Octokit({ auth: token });
}

export async function listManageableRepos() {
  const client = getClient();
  const repos = [];
  let page = 1;
  while (page <= 3) { // cap to avoid long runs; fetch up to 300 repos
    const { data } = await client.rest.repos.listForAuthenticatedUser({ per_page: 100, page, affiliation: 'owner,collaborator,organization_member' });
    repos.push(...data.filter((r) => r.permissions?.admin || r.permissions?.push));
    if (data.length < 100) break;
    page += 1;
  }
  return repos;
}

export async function getRecentCommits(username: string, since: string) {
  const client = getClient();
  const { data } = await client.request('GET /search/commits', {
    q: `author:${username} committer-date:>=${since}`,
    headers: { Accept: 'application/vnd.github.cloak-preview' },
    per_page: 50
  });
  return data.items || [];
}

export async function getRecentPRs(username: string) {
  const client = getClient();
  const { data } = await client.rest.search.issuesAndPullRequests({
    q: `is:pr author:${username} sort:created-desc` ,
    per_page: 30
  });
  return data.items || [];
}

export async function getRecentIssues(username: string) {
  const client = getClient();
  const { data } = await client.rest.search.issuesAndPullRequests({
    q: `is:issue author:${username} sort:created-desc` ,
    per_page: 30
  });
  return data.items || [];
}

export async function calculateGitHubXP(username: string) {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
  const [commits, prs, issues] = await Promise.all([
    getRecentCommits(username, since),
    getRecentPRs(username),
    getRecentIssues(username)
  ]);

  const commitXp = commits.length * XP_VALUES.COMMIT;
  const prCreatedXp = prs.filter(pr => pr.state === 'open').length * XP_VALUES.PR_CREATED;
  const prMergedXp = prs.filter(pr => pr.pull_request && pr.pull_request.merged_at).length * XP_VALUES.PR_MERGED;
  const issuesXp = issues.length * XP_VALUES.ISSUE_CREATED;

  return {
    commits: commits.length,
    prs: prs.length,
    issues: issues.length,
    xp: commitXp + prCreatedXp + prMergedXp + issuesXp
  };
}
