import { describe, test, expect, vi } from 'vitest'
import { createGithubRelease } from '../../src/release/github.js'

const mockOctokit = (data = { html_url: 'https://github.com/o/r/releases/tag/v1.0.0', id: 9 }) => ({
	rest: { repos: { createRelease: vi.fn().mockResolvedValue({ data }) } },
})

describe('createGithubRelease', () => {
	test('creates a release (and its tag) via octokit', async () => {
		const octokit = mockOctokit()
		const result = await createGithubRelease(octokit, {
			owner: 'o',
			repo: 'r',
			tagName: 'v1.0.0',
			name: 'v1.0.0',
			body: '## notes',
		})
		expect(octokit.rest.repos.createRelease).toHaveBeenCalledWith(
			expect.objectContaining({
				owner: 'o',
				repo: 'r',
				tag_name: 'v1.0.0',
				name: 'v1.0.0',
				body: '## notes',
				prerelease: false,
			})
		)
		expect(result).toEqual({
			url: 'https://github.com/o/r/releases/tag/v1.0.0',
			id: 9,
			tag: 'v1.0.0',
		})
	})

	test('defaults name to the tag and body to empty', async () => {
		const octokit = mockOctokit()
		await createGithubRelease(octokit, { owner: 'o', repo: 'r', tagName: 'v2.0.0' })
		const arg = octokit.rest.repos.createRelease.mock.calls[0][0]
		expect(arg.name).toBe('v2.0.0')
		expect(arg.body).toBe('')
	})

	test('passes prerelease and target_commitish when given', async () => {
		const octokit = mockOctokit()
		await createGithubRelease(octokit, {
			owner: 'o',
			repo: 'r',
			tagName: 'v3.0.0-next.1',
			prerelease: true,
			targetCommitish: 'main',
		})
		const arg = octokit.rest.repos.createRelease.mock.calls[0][0]
		expect(arg.prerelease).toBe(true)
		expect(arg.target_commitish).toBe('main')
	})

	test('requires owner, repo, and tagName', async () => {
		await expect(createGithubRelease(mockOctokit(), { owner: 'o', repo: 'r' })).rejects.toThrow(
			/tagName/
		)
	})
})
