import { describe, test, expect } from 'vitest'
import { parseCommit, bumpLevel } from '../../src/release/commits.js'

describe('parseCommit', () => {
	test('parses type + description', () => {
		expect(parseCommit('feat: add teams notifier')).toEqual({
			type: 'feat',
			scope: null,
			breaking: false,
			description: 'add teams notifier',
		})
	})

	test('parses scope', () => {
		expect(parseCommit('fix(slack): await all posts')).toMatchObject({
			type: 'fix',
			scope: 'slack',
			breaking: false,
		})
	})

	test('detects breaking via ! marker', () => {
		expect(parseCommit('feat(api)!: drop v1 config')).toMatchObject({
			type: 'feat',
			breaking: true,
		})
	})

	test('detects breaking via BREAKING CHANGE footer', () => {
		const msg = 'feat: rework config\n\nBREAKING CHANGE: slackWebhookUrl removed'
		expect(parseCommit(msg)).toMatchObject({ type: 'feat', breaking: true })
	})

	test('detects breaking via BREAKING-CHANGE hyphen variant', () => {
		const msg = 'refactor: core\n\nBREAKING-CHANGE: renamed dispatch'
		expect(parseCommit(msg)).toMatchObject({ breaking: true })
	})

	test('returns null for a non-conventional commit', () => {
		expect(parseCommit('random commit message')).toBeNull()
		expect(parseCommit('')).toBeNull()
	})

	test('ignores merge/junk lines gracefully', () => {
		expect(parseCommit('Merge pull request #5 from x/y')).toBeNull()
	})
})

describe('bumpLevel', () => {
	test('breaking anywhere → major', () => {
		expect(bumpLevel(['fix: a', 'feat!: b', 'chore: c'])).toBe('major')
	})

	test('feat (no breaking) → minor', () => {
		expect(bumpLevel(['fix: a', 'feat: b', 'docs: c'])).toBe('minor')
	})

	test('fix only → patch', () => {
		expect(bumpLevel(['fix: a', 'chore: b'])).toBe('patch')
	})

	test('only non-releasing types → null', () => {
		expect(bumpLevel(['chore: a', 'docs: b', 'style: c'])).toBeNull()
	})

	test('empty input → null', () => {
		expect(bumpLevel([])).toBeNull()
	})

	test('perf counts as patch', () => {
		expect(bumpLevel(['perf: faster fanout'])).toBe('patch')
	})
})
