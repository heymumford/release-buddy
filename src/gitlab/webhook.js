import { timingSafeEqual } from 'node:crypto'
import getGitlabConfig from './getConfig.js'
import dispatch from '../dispatch.js'

const CONFIG_PATH = 'releaseBuddy.config.json'
const ROUTE = '/gitlab'
const MAX_BODY = 1_000_000

// Constant-time comparison of the webhook's X-Gitlab-Token against the secret.
const tokensMatch = (received, expected) => {
	if (!expected || !received) return false
	const a = Buffer.from(String(received))
	const b = Buffer.from(String(expected))
	return a.length === b.length && timingSafeEqual(a, b)
}

const readJson = (req) =>
	new Promise((resolve, reject) => {
		let data = ''
		req.on('data', (chunk) => {
			data += chunk
			if (data.length > MAX_BODY) reject(new Error('payload too large'))
		})
		req.on('end', () => {
			try {
				resolve(data ? JSON.parse(data) : {})
			} catch (error) {
				reject(error)
			}
		})
		req.on('error', reject)
	})

const send = (res, status, obj) => {
	res.writeHead(status, { 'content-type': 'application/json' })
	res.end(JSON.stringify(obj))
}

/**
 * Build a raw-HTTP handler (for Probot 14 Server.addHandler) that receives
 * GitLab Release webhooks, verifies the token, normalizes the payload, reads
 * the project's config, and dispatches to the shared notifier core.
 *
 * Returns true when it handled the request, false to let other handlers run.
 *
 * @param {import('probot').Logger} log
 */
export default function createGitlabHandler(log) {
	return async function gitlabHandler(req, res) {
		const path = (req.url || '').split('?')[0]
		if (req.method !== 'POST' || path !== ROUTE) return false

		if (!tokensMatch(req.headers['x-gitlab-token'], process.env.GITLAB_WEBHOOK_SECRET)) {
			send(res, 401, { error: 'invalid token' })
			return true
		}

		let body
		try {
			body = await readJson(req)
		} catch (error) {
			log.warn({ err: error }, 'GitLab webhook: unreadable body.')
			send(res, 400, { error: 'invalid payload' })
			return true
		}

		if (body.object_kind !== 'release') {
			send(res, 200, { status: 'ignored', reason: 'not a release event' })
			return true
		}

		// Only the initial release should notify (mirrors GitHub's published-only
		// behavior). GitLab actions: create | update | delete.
		const action = body.action ?? body.object_attributes?.action
		if (action && action !== 'create') {
			send(res, 200, { status: 'ignored', reason: `action ${action}` })
			return true
		}

		// Tolerant reader: release-hook fields may be top-level or nested.
		const rel = body.object_attributes ?? body
		const project = body.project ?? {}
		const tag = rel.tag ?? rel.tag_name
		const releaseDetails = {
			name: rel.name,
			body: rel.description,
			url:
				rel.url ||
				(project.web_url && tag ? `${project.web_url}/-/releases/${tag}` : project.web_url),
			version: tag,
		}

		try {
			const config = await getGitlabConfig(log, project.id, tag, CONFIG_PATH)
			if (!config) {
				log.warn(`No usable ${CONFIG_PATH} for GitLab project ${project.id}.`)
				send(res, 200, { status: 'no-config' })
				return true
			}
			await dispatch({
				log,
				config,
				releaseDetails,
				repositoryName: project.name || String(project.id),
			})
			send(res, 200, { status: 'ok' })
		} catch (error) {
			log.error({ err: error }, 'GitLab release handling failed.')
			send(res, 500, { error: 'internal error' })
		}
		return true
	}
}
