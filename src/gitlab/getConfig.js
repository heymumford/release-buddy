import { validateConfig } from '../configSchema.js'

/**
 * Read and parse releaseBuddy.config.json from a GitLab project via the REST
 * API (the webhook payload carries no repo files). Returns the parsed object,
 * or undefined if it is missing, unreadable, or invalid.
 *
 * Requires GITLAB_TOKEN (read_repository scope). GITLAB_URL defaults to
 * https://gitlab.com for self-managed instances.
 *
 * @param {import('probot').Logger} log
 * @param {number|string} projectId
 * @param {string} ref  the release tag (or any git ref)
 * @param {string} configPath
 */
const getConfig = async (log, projectId, ref, configPath) => {
	const token = process.env.GITLAB_TOKEN
	if (!token) {
		log.warn('GITLAB_TOKEN is not set — cannot read config from GitLab.')
		return undefined
	}
	if (projectId === undefined || projectId === null || !ref) {
		log.warn('GitLab config read needs a project id and a ref.')
		return undefined
	}

	const base = (process.env.GITLAB_URL || 'https://gitlab.com').replace(/\/+$/, '')
	const url =
		`${base}/api/v4/projects/${encodeURIComponent(projectId)}` +
		`/repository/files/${encodeURIComponent(configPath)}/raw?ref=${encodeURIComponent(ref)}`

	try {
		const res = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } })
		if (!res.ok) {
			log.warn(
				`Could not read ${configPath} from GitLab project ${projectId} (HTTP ${res.status}).`
			)
			return undefined
		}
		const parsed = JSON.parse(await res.text())
		const { valid, errors } = validateConfig(parsed)
		if (!valid) {
			log.warn({ errors }, `${configPath} failed validation; skipping.`)
			return undefined
		}
		return parsed
	} catch (error) {
		log.warn({ err: error }, `Failed to load ${configPath} from GitLab.`)
		return undefined
	}
}

export default getConfig
