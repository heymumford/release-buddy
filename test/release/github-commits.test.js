import { describe, test, expect, vi } from 'vitest'
import { githubCommitsSinceLastTag } from '../../src/release/github-commits.js'

const octokitWith = ({ tags = [], compare = [], list = [] }) => ({
	rest: {
		repos: {
			listTags: vi.fn().mockResolvedValue({ data: tags }),
			compareCommitsWithBasehead: vi.fn().mockResolvedValue({ data: { commits: compare } }),
			listCommits: vi.fn().mockResolvedValue({ data: list }),
		},
	},
})

describe('githubCommitsSinceLastTag', () => {
	test('with a latest tag, compares tag...HEAD and returns messages', async () => {
		const octokit = octokitWith({
			tags: [{ name: 'v1.2.0' }],
			compare: [{ commit: { message: 'feat: a' } }, { commit: { message: 'fix: b' } }],
		})
		const result = await githubCommitsSinceLastTag(octokit, { owner: 'o', repo: 'r' })
		expect(result.lastTag).toBe('v1.2.0')
		expect(result.commits).toEqual(['feat: a', 'fix: b'])
		expect(octokit.rest.repos.compareCommitsWithBasehead).toHaveBeenCalledWith(
			expect.objectContaining({ owner: 'o', repo: 'r', basehead: 'v1.2.0...HEAD' })
		)
		expect(octokit.rest.repos.listCommits).not.toHaveBeenCalled()
	})

	test('with no tags, lists all commits (first release)', async () => {
		const octokit = octokitWith({
			tags: [],
			list: [{ commit: { message: 'feat: initial' } }],
		})
		const result = await githubCommitsSinceLastTag(octokit, { owner: 'o', repo: 'r' })
		expect(result.lastTag).toBeNull()
		expect(result.commits).toEqual(['feat: initial'])
		expect(octokit.rest.repos.compareCommitsWithBasehead).not.toHaveBeenCalled()
	})

	test('requires owner and repo', async () => {
		await expect(githubCommitsSinceLastTag(octokitWith({}), { owner: 'o' })).rejects.toThrow(/repo/)
	})
})
