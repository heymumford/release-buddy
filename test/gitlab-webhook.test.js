import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { Readable } from 'node:stream'

vi.mock('../src/gitlab/getConfig.js', () => ({ default: vi.fn() }))
vi.mock('../src/dispatch.js', () => ({ default: vi.fn().mockResolvedValue(undefined) }))

import getGitlabConfig from '../src/gitlab/getConfig.js'
import dispatch from '../src/dispatch.js'
import createGitlabHandler from '../src/gitlab/webhook.js'

const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
const handler = createGitlabHandler(log)

const SECRET = 'shh'
const releasePayload = {
	object_kind: 'release',
	action: 'create',
	name: 'v1.0.0',
	tag: 'v1.0.0',
	description: '# notes',
	url: 'https://gitlab.com/acme/app/-/releases/v1.0.0',
	project: { id: 42, name: 'app', web_url: 'https://gitlab.com/acme/app' },
}

const mockReq = ({ method = 'POST', url = '/gitlab', headers = {}, body } = {}) => {
	const payload = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)
	const req = Readable.from([payload])
	req.method = method
	req.url = url
	req.headers = headers
	return req
}

const mockRes = () => ({
	statusCode: null,
	body: null,
	writeHead(status) {
		this.statusCode = status
		return this
	},
	end(payload) {
		this.body = payload ? JSON.parse(payload) : null
	},
})

const withToken = (extra = {}) => ({ 'x-gitlab-token': SECRET, ...extra })

beforeEach(() => {
	vi.clearAllMocks()
	vi.stubEnv('GITLAB_WEBHOOK_SECRET', SECRET)
})
afterEach(() => vi.unstubAllEnvs())

describe('GitLab webhook handler', () => {
	test('ignores non-POST or non-/gitlab requests (returns false, unhandled)', async () => {
		const res = mockRes()
		expect(await handler(mockReq({ method: 'GET', url: '/gitlab' }), res)).toBe(false)
		expect(await handler(mockReq({ url: '/other' }), res)).toBe(false)
		expect(res.statusCode).toBeNull()
	})

	test('rejects a bad/missing token with 401', async () => {
		const res = mockRes()
		const handled = await handler(
			mockReq({ headers: { 'x-gitlab-token': 'wrong' }, body: releasePayload }),
			res
		)
		expect(handled).toBe(true)
		expect(res.statusCode).toBe(401)
		expect(dispatch).not.toHaveBeenCalled()
	})

	test('ignores non-release events with 200', async () => {
		const res = mockRes()
		await handler(mockReq({ headers: withToken(), body: { object_kind: 'push' } }), res)
		expect(res.statusCode).toBe(200)
		expect(res.body.status).toBe('ignored')
		expect(dispatch).not.toHaveBeenCalled()
	})

	test('ignores release actions other than create', async () => {
		const res = mockRes()
		await handler(
			mockReq({ headers: withToken(), body: { ...releasePayload, action: 'update' } }),
			res
		)
		expect(res.statusCode).toBe(200)
		expect(res.body.reason).toMatch(/update/)
		expect(dispatch).not.toHaveBeenCalled()
	})

	test('dispatches a valid release-create, normalizing the payload', async () => {
		getGitlabConfig.mockResolvedValueOnce({ slackSettings: { enabled: true }, teamName: 'T' })
		const res = mockRes()
		await handler(mockReq({ headers: withToken(), body: releasePayload }), res)
		expect(res.statusCode).toBe(200)
		expect(res.body.status).toBe('ok')
		expect(getGitlabConfig).toHaveBeenCalledWith(log, 42, 'v1.0.0', 'releaseBuddy.config.json')
		expect(dispatch).toHaveBeenCalledTimes(1)
		const arg = dispatch.mock.calls[0][0]
		expect(arg.repositoryName).toBe('app')
		expect(arg.releaseDetails).toEqual({
			name: 'v1.0.0',
			body: '# notes',
			url: 'https://gitlab.com/acme/app/-/releases/v1.0.0',
			version: 'v1.0.0',
		})
	})

	test('returns 200 no-config when the project has no usable config', async () => {
		getGitlabConfig.mockResolvedValueOnce(undefined)
		const res = mockRes()
		await handler(mockReq({ headers: withToken(), body: releasePayload }), res)
		expect(res.statusCode).toBe(200)
		expect(res.body.status).toBe('no-config')
		expect(dispatch).not.toHaveBeenCalled()
	})
})
