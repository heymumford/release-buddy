import { describe, test, expect } from 'vitest'
import { generateChangelogSection } from '../../src/release/changelog.js'

const commits = [
	'feat(slack): add teams notifier',
	'fix: await all posts',
	'feat!: drop v1 config\n\nBREAKING CHANGE: slackWebhookUrl removed',
	'perf: faster fanout',
	'chore: bump deps', // non-releasing — omitted
	'docs: tweak readme', // non-releasing — omitted
]

describe('generateChangelogSection', () => {
	const section = generateChangelogSection('1.3.0', '2026-07-01', commits)

	test('starts with a Keep a Changelog version header', () => {
		expect(section.split('\n')[0]).toBe('## [1.3.0] - 2026-07-01')
	})

	test('groups feat under Added and fix under Fixed', () => {
		expect(section).toContain('### Added')
		expect(section).toContain('add teams notifier')
		expect(section).toContain('### Fixed')
		expect(section).toContain('await all posts')
	})

	test('surfaces breaking changes in their own section', () => {
		expect(section).toMatch(/### .*Breaking/i)
		expect(section).toContain('drop v1 config')
	})

	test('prefixes a scoped commit with its scope', () => {
		expect(section).toContain('**slack:** add teams notifier')
	})

	test('groups perf under Changed', () => {
		expect(section).toContain('### Changed')
		expect(section).toContain('faster fanout')
	})

	test('omits non-releasing types (chore, docs)', () => {
		expect(section).not.toContain('bump deps')
		expect(section).not.toContain('tweak readme')
	})

	test('returns null when there are no releasable commits', () => {
		expect(generateChangelogSection('1.0.1', '2026-07-01', ['chore: x', 'docs: y'])).toBeNull()
	})
})
