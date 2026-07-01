/**
 * Read the commit messages since the last tag on a GitLab project. Compares
 * `from=<lastTag>&to=<ref>`; if the project has no tags, returns all commits
 * (first release). Requires GITLAB_TOKEN (read_repository); GITLAB_URL defaults
 * to https://gitlab.com. Uses the global fetch — no injected client needed.
 *
 * @param {import('probot').Logger} log
 * @param {{projectId: number|string, ref: string}} opts ref = the target (branch/sha/tag) to compare to
 * @returns {Promise<{lastTag: string|null, commits: string[]}>}
 */
export const gitlabCommitsSinceLastTag = async (log, { projectId, ref }) => {
	const token = process.env.GITLAB_TOKEN
	if (!token) {
		log.warn('GITLAB_TOKEN is not set — cannot read commits from GitLab.')
		return { lastTag: null, commits: [] }
	}
	if (projectId === undefined || projectId === null || !ref) {
		throw new Error('gitlabCommitsSinceLastTag requires projectId and ref.')
	}

	const base = (process.env.GITLAB_URL || 'https://gitlab.com').replace(/\/+$/, '')
	const api = `${base}/api/v4/projects/${encodeURIComponent(projectId)}`
	const headers = { 'PRIVATE-TOKEN': token }

	const tagsRes = await fetch(`${api}/repository/tags?per_page=1`, { headers })
	const tags = tagsRes.ok ? await tagsRes.json() : []
	const lastTag = tags?.[0]?.name ?? null

	if (lastTag) {
		const cmp = await fetch(
			`${api}/repository/compare?from=${encodeURIComponent(lastTag)}&to=${encodeURIComponent(ref)}`,
			{ headers }
		)
		const data = cmp.ok ? await cmp.json() : { commits: [] }
		return { lastTag, commits: (data.commits ?? []).map((c) => c.message) }
	}

	const listRes = await fetch(`${api}/repository/commits?per_page=100`, { headers })
	const list = listRes.ok ? await listRes.json() : []
	return { lastTag: null, commits: (list ?? []).map((c) => c.message) }
}
