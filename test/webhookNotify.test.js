import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import webhookNotify from '../src/webhookNotify.js'

const release = { name: 'v1.0.0', body: '# notes', url: 'http://x/r', version: 'v1.0.0' }
const ok = () => ({ ok: true, status: 200, text: async () => 'ok' })

beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok())))
afterEach(() => {
	vi.unstubAllGlobals()
	vi.unstubAllEnvs()
})

describe('webhookNotify', () => {
	test('POSTs a JSON payload to the configured url', async () => {
		await webhookNotify({ url: 'https://hook.example/x' }, 'repo', release, 'Team')
		const [url, opts] = fetch.mock.calls[0]
		expect(url).toBe('https://hook.example/x')
		expect(opts.method).toBe('POST')
		expect(opts.headers['Content-Type']).toBe('application/json')
		expect(JSON.parse(opts.body)).toEqual({
			repo: 'repo',
			team: 'Team',
			version: 'v1.0.0',
			name: 'v1.0.0',
			url: 'http://x/r',
			body: '# notes',
		})
	})

	test('reads the url from an env var when urlEnv is set', async () => {
		vi.stubEnv('MY_HOOK', 'https://hook.example/env')
		await webhookNotify({ urlEnv: 'MY_HOOK' }, 'repo', release, 'Team')
		expect(fetch.mock.calls[0][0]).toBe('https://hook.example/env')
	})

	test('throws on a non-2xx response (so retry applies)', async () => {
		fetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'boom' })
		await expect(
			webhookNotify({ url: 'https://hook.example/x' }, 'repo', release, 'Team')
		).rejects.toThrow(/500/)
	})

	test('throws when no url is configured', async () => {
		await expect(webhookNotify({}, 'repo', release, 'Team')).rejects.toThrow(/url/)
	})

	test('throws a clear error when the named env var is unset', async () => {
		await expect(webhookNotify({ urlEnv: 'MISSING' }, 'repo', release, 'Team')).rejects.toThrow(
			/MISSING is not set/
		)
	})
})
