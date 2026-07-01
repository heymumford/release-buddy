import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { createGitlabRelease } from '../../src/release/gitlab.js'

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

describe('createGitlabRelease', () => {
	test('POSTs to the releases API with token and body', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				status: 201,
				json: async () => ({
					tag_name: 'v1.0.0',
					_links: { self: 'https://gitlab.com/acme/app/-/releases/v1.0.0' },
				}),
			})
		)
		const result = await createGitlabRelease(log, {
			projectId: 42,
			tagName: 'v1.0.0',
			ref: 'main',
			name: 'v1.0.0',
			description: '## notes',
		})
		const [url, opts] = fetch.mock.calls[0]
		expect(url).toBe('https://gitlab.com/api/v4/projects/42/releases')
		expect(opts.method).toBe('POST')
		expect(opts.headers['PRIVATE-TOKEN']).toBe('glpat-test')
		const body = JSON.parse(opts.body)
		expect(body).toMatchObject({
			tag_name: 'v1.0.0',
			name: 'v1.0.0',
			description: '## notes',
			ref: 'main',
		})
		expect(result).toEqual({ url: 'https://gitlab.com/acme/app/-/releases/v1.0.0', tag: 'v1.0.0' })
	})

	test('honors a self-managed GITLAB_URL', async () => {
		vi.stubEnv('GITLAB_URL', 'https://gitlab.acme.com/')
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: true, json: async () => ({ tag_name: 'v1' }) })
		)
		await createGitlabRelease(log, { projectId: 7, tagName: 'v1' })
		expect(fetch.mock.calls[0][0]).toBe('https://gitlab.acme.com/api/v4/projects/7/releases')
	})

	test('throws without a token', async () => {
		vi.stubEnv('GITLAB_TOKEN', '')
		await expect(createGitlabRelease(log, { projectId: 42, tagName: 'v1' })).rejects.toThrow(
			/GITLAB_TOKEN/
		)
	})

	test('throws on a non-2xx response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => 'forbidden' })
		)
		await expect(createGitlabRelease(log, { projectId: 42, tagName: 'v1' })).rejects.toThrow(/403/)
	})
})
