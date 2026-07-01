import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { gitlabCommitsSinceLastTag } from '../../src/release/gitlab-commits.js'

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

const ok = (body) => ({ ok: true, json: async () => body })

describe('gitlabCommitsSinceLastTag', () => {
	test('with a latest tag, compares from=tag&to=ref and returns messages', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValueOnce(ok([{ name: 'v1.2.0' }]))
				.mockResolvedValueOnce(ok({ commits: [{ message: 'feat: a' }, { message: 'fix: b' }] }))
		)
		const result = await gitlabCommitsSinceLastTag(log, { projectId: 42, ref: 'main' })
		expect(result.lastTag).toBe('v1.2.0')
		expect(result.commits).toEqual(['feat: a', 'fix: b'])
		expect(fetch.mock.calls[0][0]).toBe(
			'https://gitlab.com/api/v4/projects/42/repository/tags?per_page=1'
		)
		expect(fetch.mock.calls[1][0]).toContain('/repository/compare?from=v1.2.0&to=main')
		expect(fetch.mock.calls[1][1].headers['PRIVATE-TOKEN']).toBe('glpat-test')
	})

	test('with no tags, lists all commits (first release)', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn()
				.mockResolvedValueOnce(ok([]))
				.mockResolvedValueOnce(ok([{ message: 'feat: initial' }]))
		)
		const result = await gitlabCommitsSinceLastTag(log, { projectId: 42, ref: 'main' })
		expect(result.lastTag).toBeNull()
		expect(result.commits).toEqual(['feat: initial'])
		expect(fetch.mock.calls[1][0]).toContain('/repository/commits?per_page=100')
	})

	test('without a token, warns and returns empty (no fetch)', async () => {
		vi.stubEnv('GITLAB_TOKEN', '')
		vi.stubGlobal('fetch', vi.fn())
		const result = await gitlabCommitsSinceLastTag(log, { projectId: 42, ref: 'main' })
		expect(result).toEqual({ lastTag: null, commits: [] })
		expect(fetch).not.toHaveBeenCalled()
		expect(log.warn).toHaveBeenCalled()
	})

	test('requires projectId and ref', async () => {
		await expect(gitlabCommitsSinceLastTag(log, { projectId: 42 })).rejects.toThrow(/ref/)
	})
})
