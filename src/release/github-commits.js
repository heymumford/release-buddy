/**
 * Read the commit messages since the last tag on a GitHub repo. Compares
 * `<lastTag>...HEAD`; if the repo has no tags yet, returns all commits (first
 * release). Pure adapter — the caller injects octokit.
 *
 * @param {import('probot').ProbotOctokit} octokit
 * @param {{owner: string, repo: string}} opts
 * @returns {Promise<{lastTag: string|null, commits: string[]}>}
 */
export const githubCommitsSinceLastTag = async (octokit, { owner, repo }) => {
	if (!owner || !repo) throw new Error('githubCommitsSinceLastTag requires owner and repo.')

	const tags = await octokit.rest.repos.listTags({ owner, repo, per_page: 1 })
	const lastTag = tags.data?.[0]?.name ?? null

	if (lastTag) {
		const cmp = await octokit.rest.repos.compareCommitsWithBasehead({
			owner,
			repo,
			basehead: `${lastTag}...HEAD`,
		})
		return { lastTag, commits: (cmp.data.commits ?? []).map((c) => c.commit.message) }
	}

	const list = await octokit.rest.repos.listCommits({ owner, repo, per_page: 100 })
	return { lastTag: null, commits: (list.data ?? []).map((c) => c.commit.message) }
}
