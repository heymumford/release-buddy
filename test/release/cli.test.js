import { describe, test, expect, vi } from 'vitest'
import { runReleaseCli } from '../../src/release/cli.js'
import { runRelease } from '../../src/release/run.js'

const makeLog = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })
const fixedNow = () => new Date('2026-07-01T12:00:00Z')

// Real runRelease wired in so the tests prove end-to-end CLI orchestration,
// not a mock of the thing under test. Only the I/O adapters are injected.
const baseDeps = (over = {}) => ({
	makeOctokit: vi.fn(() => ({})),
	githubCommitsSinceLastTag: vi.fn(async () => ({
		lastTag: 'v1.2.3',
		commits: ['feat: add teams'],
	})),
	createGithubRelease: vi.fn(async () => ({
		url: 'https://x/releases/v1.3.0',
		id: 1,
		tag: 'v1.3.0',
	})),
	runRelease,
	...over,
})

describe('runReleaseCli — dry-run safety', () => {
	test('dry-run is the default and never calls the network release create', async () => {
		const deps = baseDeps()
		const result = await runReleaseCli({
			argv: ['--repo', 'acme/widget'],
			env: {},
			log: makeLog(),
			now: fixedNow,
			deps,
		})
		expect(result.dryRun).toBe(true)
		expect(result.code).toBe(0)
		expect(result.released).toBe(true)
		expect(result.version).toBe('1.3.0')
		expect(deps.createGithubRelease).not.toHaveBeenCalled()
	})

	test('dry-run announces itself and marks the simulated create in the log', async () => {
		const log = makeLog()
		await runReleaseCli({
			argv: ['--repo', 'acme/widget'],
			env: {},
			log,
			now: fixedNow,
			deps: baseDeps(),
		})
		const lines = log.info.mock.calls.map((c) => String(c[0]))
		// A dry run must never read like a real release in the logs.
		expect(lines.some((l) => /dry run/i.test(l))).toBe(true)
		expect(lines.some((l) => /\[dry-run\].*created release/i.test(l))).toBe(true)
		expect(lines.some((l) => /^Created release/.test(l))).toBe(false)
	})

	test('dry-run prints the planned changelog so notes can be previewed before --live', async () => {
		const log = makeLog()
		await runReleaseCli({
			argv: ['--repo', 'acme/widget'],
			env: {},
			log,
			now: fixedNow,
			deps: baseDeps(), // commit: 'feat: add teams'
		})
		const out = log.info.mock.calls.map((c) => String(c[0])).join('\n')
		// The changelog section contains the commit subject; the status messages do not.
		expect(out).toMatch(/add teams/)
	})
})

describe('runReleaseCli — live mode', () => {
	test('--live with a token creates the real release with the v-tag and changelog body', async () => {
		const deps = baseDeps()
		const result = await runReleaseCli({
			argv: ['--repo', 'acme/widget', '--live'],
			env: { GITHUB_TOKEN: 'ghp_test' },
			log: makeLog(),
			now: fixedNow,
			deps,
		})
		expect(result.dryRun).toBe(false)
		expect(result.released).toBe(true)
		expect(result.url).toBe('https://x/releases/v1.3.0')
		expect(deps.makeOctokit).toHaveBeenCalledWith('ghp_test')
		expect(deps.createGithubRelease).toHaveBeenCalledTimes(1)
		const arg = deps.createGithubRelease.mock.calls[0][1]
		expect(arg).toMatchObject({ owner: 'acme', repo: 'widget', tagName: 'v1.3.0' })
		expect(arg.body).toContain('add teams')
	})

	test('--live without a token refuses and never touches the network', async () => {
		const deps = baseDeps()
		const result = await runReleaseCli({
			argv: ['--repo', 'acme/widget', '--live'],
			env: {},
			log: makeLog(),
			now: fixedNow,
			deps,
		})
		expect(result.code).toBe(2)
		expect(result.released).toBe(false)
		expect(result.message).toMatch(/token/i)
		expect(deps.createGithubRelease).not.toHaveBeenCalled()
		expect(deps.githubCommitsSinceLastTag).not.toHaveBeenCalled()
	})
})

describe('runReleaseCli — argument hardening (review findings)', () => {
	test('--repo without a slash and no --owner reports the OWNER as missing, not --repo', async () => {
		const result = await runReleaseCli({
			argv: ['--repo', 'widget'],
			env: {},
			log: makeLog(),
			now: fixedNow,
			deps: baseDeps(),
		})
		expect(result.code).toBe(2)
		expect(result.message).toMatch(/owner/i)
		// The real gap is the owner; the message must not blame --repo (it was given).
		expect(result.message).not.toMatch(/missing --repo/i)
	})

	test('split form --owner acme --repo widget resolves to acme/widget', async () => {
		const deps = baseDeps()
		const result = await runReleaseCli({
			argv: ['--owner', 'acme', '--repo', 'widget', '--live'],
			env: { GITHUB_TOKEN: 'ghp_test' },
			log: makeLog(),
			now: fixedNow,
			deps,
		})
		expect(result.released).toBe(true)
		const arg = deps.createGithubRelease.mock.calls[0][1]
		expect(arg).toMatchObject({ owner: 'acme', repo: 'widget' })
	})

	test('a three-segment --repo is rejected rather than silently truncated', async () => {
		const result = await runReleaseCli({
			argv: ['--repo', 'a/b/c'],
			env: {},
			log: makeLog(),
			now: fixedNow,
			deps: baseDeps(),
		})
		expect(result.code).toBe(2)
		expect(result.message).toMatch(/invalid|owner\/name/i)
	})

	test('--owner conflicting with a slashed --repo is rejected, never silently retargeted', async () => {
		const deps = baseDeps()
		const result = await runReleaseCli({
			argv: ['--owner', 'acme', '--repo', 'other/widget', '--live'],
			env: { GITHUB_TOKEN: 'ghp_test' },
			log: makeLog(),
			now: fixedNow,
			deps,
		})
		expect(result.code).toBe(2)
		expect(result.message).toMatch(/conflict/i)
		expect(deps.createGithubRelease).not.toHaveBeenCalled()
	})

	test('a flag given as another flag value is a usage error, not a swallowed flag', async () => {
		const result = await runReleaseCli({
			argv: ['--repo', '--live'],
			env: {},
			log: makeLog(),
			now: fixedNow,
			deps: baseDeps(),
		})
		expect(result.code).toBe(2)
		expect(result.message).toMatch(/value/i)
	})

	test('--current-version overrides the last tag as the version base', async () => {
		const result = await runReleaseCli({
			argv: ['--repo', 'acme/widget', '--current-version', '2.0.0'],
			env: {},
			log: makeLog(),
			now: fixedNow,
			deps: baseDeps(), // lastTag v1.2.3 + feat -> would be 1.3.0 without the override
		})
		expect(result.released).toBe(true)
		expect(result.version).toBe('2.1.0')
	})
})

describe('runReleaseCli — argument validation', () => {
	test('missing --repo refuses with a usage error and no network call', async () => {
		const deps = baseDeps()
		const result = await runReleaseCli({
			argv: [],
			env: {},
			log: makeLog(),
			now: fixedNow,
			deps,
		})
		expect(result.code).toBe(2)
		expect(result.released).toBe(false)
		expect(result.message).toMatch(/repo/i)
		expect(deps.githubCommitsSinceLastTag).not.toHaveBeenCalled()
	})

	test('a network failure reading commits degrades to a clean error, not a raw stack', async () => {
		const deps = baseDeps({
			githubCommitsSinceLastTag: vi.fn(async () => {
				const err = new Error('Not Found')
				err.status = 404
				throw err
			}),
		})
		const result = await runReleaseCli({
			argv: ['--repo', 'acme/widget'],
			env: {},
			log: makeLog(),
			now: fixedNow,
			deps,
		})
		expect(result.code).toBe(1)
		expect(result.released).toBe(false)
		expect(result.message).toMatch(/acme\/widget/)
		expect(result.message).toMatch(/not found|404|failed/i)
		expect(deps.createGithubRelease).not.toHaveBeenCalled()
	})

	test('no releasable commits: exits 0, creates nothing even in --live', async () => {
		const deps = baseDeps({
			githubCommitsSinceLastTag: vi.fn(async () => ({
				lastTag: 'v1.2.3',
				commits: ['chore: deps'],
			})),
		})
		const result = await runReleaseCli({
			argv: ['--repo', 'acme/widget', '--live'],
			env: { GITHUB_TOKEN: 'ghp_test' },
			log: makeLog(),
			now: fixedNow,
			deps,
		})
		expect(result.code).toBe(0)
		expect(result.released).toBe(false)
		expect(result.message).toMatch(/no releasable/i)
		expect(deps.createGithubRelease).not.toHaveBeenCalled()
	})
})
