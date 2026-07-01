import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import getConfig from '../src/gitlab/getConfig.js'

const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

beforeEach(() => {
	vi.clearAllMocks()
	vi.stubEnv('GITLAB_TOKEN', 'glpat-test')
	vi.stubEnv('GITLAB_URL', '')
})
afterEach(() => {
	vi.unstubAllEnvs()
	vi.unstubAllGlobals()
})

describe('gitlab/getConfig', () => {
	test('fetches the raw config file with the token and parses it', async () => {
		const cfg = { teamName: 'T', slackSettings: { enabled: true } }
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify(cfg) })
		)
		const result = await getConfig(log, 42, 'v1.0.0', 'releaseBuddy.config.json')
		expect(result).toEqual(cfg)
		const [url, opts] = fetch.mock.calls[0]
		expect(url).toBe(
			'https://gitlab.com/api/v4/projects/42/repository/files/releaseBuddy.config.json/raw?ref=v1.0.0'
		)
		expect(opts.headers['PRIVATE-TOKEN']).toBe('glpat-test')
	})

	test('honors a self-managed GITLAB_URL', async () => {
		vi.stubEnv('GITLAB_URL', 'https://gitlab.acme.com/')
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '{}' }))
		await getConfig(log, 7, 'main', 'releaseBuddy.config.json')
		expect(fetch.mock.calls[0][0]).toMatch(/^https:\/\/gitlab\.acme\.com\/api\/v4\/projects\/7\//)
	})

	test('returns undefined without a token', async () => {
		vi.stubEnv('GITLAB_TOKEN', '')
		expect(await getConfig(log, 42, 'v1.0.0', 'releaseBuddy.config.json')).toBeUndefined()
	})

	test('returns undefined on a non-2xx response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => '' })
		)
		expect(await getConfig(log, 42, 'v1.0.0', 'releaseBuddy.config.json')).toBeUndefined()
	})

	test('returns undefined on invalid JSON', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '{bad' }))
		expect(await getConfig(log, 42, 'v1.0.0', 'releaseBuddy.config.json')).toBeUndefined()
	})
})
