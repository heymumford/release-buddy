import { describe, test, expect, vi } from 'vitest'
import { runRelease } from '../../src/release/run.js'

const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

describe('runRelease (create-then-announce orchestration)', () => {
	test('skips when there are no releasable commits', async () => {
		const createRelease = vi.fn()
		const notify = vi.fn()
		const result = await runRelease({
			log,
			currentVersion: '1.2.3',
			date: '2026-07-01',
			getCommits: async () => ({ lastTag: 'v1.2.3', commits: ['chore: x'] }),
			createRelease,
			notify,
		})
		expect(result).toEqual({ released: false })
		expect(createRelease).not.toHaveBeenCalled()
		expect(notify).not.toHaveBeenCalled()
	})

	test('creates the release then announces it', async () => {
		const created = { url: 'https://example/releases/v1.3.0', tag: 'v1.3.0' }
		const createRelease = vi.fn().mockResolvedValue(created)
		const notify = vi.fn().mockResolvedValue(undefined)
		const result = await runRelease({
			log,
			currentVersion: '1.2.3',
			date: '2026-07-01',
			getCommits: async () => ({ lastTag: 'v1.2.3', commits: ['feat: add teams'] }),
			createRelease,
			notify,
		})
		expect(result.released).toBe(true)
		expect(result.version).toBe('1.3.0')
		expect(result.release).toBe(created)
		const arg = createRelease.mock.calls[0][0]
		expect(arg.version).toBe('1.3.0')
		expect(arg.changelog).toContain('add teams')
		// announce happens after creation, with the created release in hand
		expect(notify).toHaveBeenCalledTimes(1)
		expect(notify.mock.calls[0][0].release).toBe(created)
	})

	test('notify is optional', async () => {
		const createRelease = vi.fn().mockResolvedValue({ tag: 'v2.0.0' })
		const result = await runRelease({
			log,
			currentVersion: '1.2.3',
			date: '2026-07-01',
			getCommits: async () => ({ lastTag: 'v1.2.3', commits: ['feat!: break'] }),
			createRelease,
		})
		expect(result.released).toBe(true)
		expect(result.version).toBe('2.0.0')
	})
})
