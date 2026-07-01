/**
 * Create a GitHub Release (which also creates the tag) via an authenticated
 * octokit client. Pure adapter: the caller injects octokit, so this never
 * reaches the network in tests.
 *
 * @param {import('probot').ProbotOctokit} octokit
 * @param {object} opts
 * @param {string} opts.owner
 * @param {string} opts.repo
 * @param {string} opts.tagName
 * @param {string} [opts.name] defaults to tagName
 * @param {string} [opts.body] release notes (markdown)
 * @param {boolean} [opts.prerelease=false]
 * @param {string} [opts.targetCommitish] branch/sha to tag when the tag is new
 * @returns {Promise<{url: string, id: number, tag: string}>}
 */
export const createGithubRelease = async (
	octokit,
	{ owner, repo, tagName, name, body, prerelease = false, targetCommitish }
) => {
	if (!owner || !repo || !tagName) {
		throw new Error('createGithubRelease requires owner, repo, and tagName.')
	}

	const { data } = await octokit.rest.repos.createRelease({
		owner,
		repo,
		tag_name: tagName,
		name: name || tagName,
		body: body || '',
		prerelease,
		...(targetCommitish ? { target_commitish: targetCommitish } : {}),
	})

	return { url: data.html_url, id: data.id, tag: tagName }
}
