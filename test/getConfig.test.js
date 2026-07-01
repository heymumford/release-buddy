import { describe, beforeEach, test, expect, vi } from 'vitest'
import getConfig from '../src/getConfig.js'

const log = { info: vi.fn(), warn: vi.fn() }

const contextWith = (data) => ({
	repo: (overrides) => ({ owner: 'o', repo: 'r', ...overrides }),
	octokit: { repos: { getContent: vi.fn().mockResolvedValue(data) } },
})

const asFile = (obj) => ({
	data: { content: Buffer.from(JSON.stringify(obj)).toString('base64') },
})

describe('getConfig', () => {
	beforeEach(() => vi.clearAllMocks())

	test('parses a valid config file', async () => {
		const cfg = { teamName: 'T', slackSettings: { enabled: true } }
		const result = await getConfig(log, contextWith(asFile(cfg)), 'releaseBuddy.config.json')
		expect(result).toEqual(cfg)
	})

	test('returns undefined for invalid JSON', async () => {
		const bad = { data: { content: Buffer.from('{not json').toString('base64') } }
		expect(await getConfig(log, contextWith(bad), 'x')).toBeUndefined()
	})

	test('returns undefined when the path is a directory (array response)', async () => {
		expect(await getConfig(log, contextWith({ data: [{ name: 'a' }] }), 'x')).toBeUndefined()
	})

	test('returns undefined when the file is missing (getContent throws)', async () => {
		const ctx = contextWith(null)
		ctx.octokit.repos.getContent = vi.fn().mockRejectedValue(new Error('404'))
		expect(await getConfig(log, ctx, 'x')).toBeUndefined()
	})
})
