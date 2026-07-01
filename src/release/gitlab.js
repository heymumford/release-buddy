/**
 * Create a GitLab Release via the REST API. Requires GITLAB_TOKEN (with
 * api/write scope); GITLAB_URL defaults to https://gitlab.com for self-managed.
 *
 * @param {import('probot').Logger} log
 * @param {object} opts
 * @param {number|string} opts.projectId
 * @param {string} opts.tagName
 * @param {string} [opts.ref] branch/sha to tag from when the tag does not exist
 * @param {string} [opts.name] defaults to tagName
 * @param {string} [opts.description] release notes (markdown)
 * @returns {Promise<{url: string, tag: string}>}
 */
export const createGitlabRelease = async (log, { projectId, tagName, ref, name, description }) => {
	const token = process.env.GITLAB_TOKEN
	if (!token) throw new Error('GITLAB_TOKEN is required to create a GitLab release.')
	if (projectId === undefined || projectId === null || !tagName) {
		throw new Error('createGitlabRelease requires projectId and tagName.')
	}

	const base = (process.env.GITLAB_URL || 'https://gitlab.com').replace(/\/+$/, '')
	const url = `${base}/api/v4/projects/${encodeURIComponent(projectId)}/releases`

	const res = await fetch(url, {
		method: 'POST',
		headers: { 'PRIVATE-TOKEN': token, 'content-type': 'application/json' },
		body: JSON.stringify({
			tag_name: tagName,
			name: name || tagName,
			description: description || '',
			...(ref ? { ref } : {}),
		}),
	})

	if (!res.ok) {
		const detail = await res.text().catch(() => '')
		throw new Error(`GitLab release create responded ${res.status}${detail ? `: ${detail}` : ''}`)
	}

	const data = await res.json()
	return {
		url: data._links?.self || `${base}/api/v4/projects/${projectId}/releases/${tagName}`,
		tag: tagName,
	}
}
