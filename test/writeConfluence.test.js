import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest'
import writeConfluence from '../src/writeConfluence.js'

const settings = { space: 'REL', parentId: '999' }
const release = { name: 'v1', body: '# notes', version: 'v1.0.0' }

const setEnv = () => {
	vi.stubEnv('CONFLUENCE_USER', 'user@example.com')
	vi.stubEnv('CONFLUENCE_API_KEY', 'token')
	vi.stubEnv('CONFLUENCE_BASE_URL', 'https://org.atlassian.net/wiki')
}

describe('writeConfluence', () => {
	beforeEach(() => {
		setEnv()
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: '1' }) })
		)
	})
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.unstubAllEnvs()
		vi.useRealTimers()
	})

	test('zero-pads single-digit days in the page title (bug #4)', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-06-05T12:00:00Z'))
		await writeConfluence(settings, release, 'repo', 'Team')
		const body = JSON.parse(fetch.mock.calls[0][1].body)
		expect(body.title).toBe('2026-06-05 - repo v1.0.0')
	})

	test('posts to the Confluence REST content endpoint with basic auth', async () => {
		await writeConfluence(settings, release, 'repo', 'Team')
		const [url, opts] = fetch.mock.calls[0]
		expect(url).toBe('https://org.atlassian.net/wiki/rest/api/content')
		expect(opts.headers.Authorization).toMatch(/^Basic /)
		const body = JSON.parse(opts.body)
		expect(body.space.key).toBe('REL')
		expect(body.ancestors).toEqual([{ id: '999' }])
	})

	test('rejects when Confluence returns an error (bug #3 — no swallowed callback)', async () => {
		fetch.mockResolvedValueOnce({ ok: false, status: 403, text: async () => 'forbidden' })
		await expect(writeConfluence(settings, release, 'repo', 'Team')).rejects.toThrow(/403/)
	})

	test('throws when Confluence env vars are missing', async () => {
		vi.stubEnv('CONFLUENCE_API_KEY', '')
		await expect(writeConfluence(settings, release, 'repo', 'Team')).rejects.toThrow(
			/Confluence environment/
		)
	})
})
