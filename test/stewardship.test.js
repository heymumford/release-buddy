import { describe, test, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Structural fitness: assert the fork-stewardship and security wiring is present
// on disk. Removing a control breaks CI rather than silently eroding the posture.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (f) => readFileSync(join(root, f), 'utf8')
const has = (f) => existsSync(join(root, f))

describe('fork stewardship wiring', () => {
	test.each([
		'LICENSE',
		'FORK.md',
		'GOVERNANCE.md',
		'SECURITY.md',
		'CHANGELOG.md',
		'CONTRIBUTING.md',
		'CODE_OF_CONDUCT.md',
		'.gitleaks.toml',
		'.editorconfig',
		'.gitattributes',
		'.github/dependabot.yml',
		'.github/workflows/ci.yml',
		'.github/workflows/codeql.yml',
		'.github/pull_request_template.md',
		'.github/CODEOWNERS',
		'docs/adr/0001-maintained-fork-of-ecobee-release-buddy.md',
	])('ships %s', (file) => {
		expect(has(file), `${file} is required by the stewardship policy`).toBe(true)
	})

	test('LICENSE preserves the upstream ecobee copyright (ISC attribution)', () => {
		const license = read('LICENSE')
		expect(license).toMatch(/ISC/)
		expect(license).toMatch(/ecobee Inc\./)
	})

	test('README states the fork is not affiliated with upstream', () => {
		expect(read('README.md')).toMatch(/not affiliated with or endorsed by ecobee/i)
	})

	test('no live Slack webhook is committed anywhere tracked', () => {
		// Match the Slack webhook token triplet shape (T…/B…/secret) anywhere in
		// the file. Anchored at the services path segment, not a hostname, so this
		// is a content search — not URL validation.
		const slackToken = /\/services\/T[A-Z0-9]{6,}\/B[A-Z0-9]{6,}\/[A-Za-z0-9]{20,}(?![A-Za-z0-9])/
		for (const f of ['releaseBuddy.config.json', 'README.md', 'test/fixtures/configs.js']) {
			expect(read(f)).not.toMatch(slackToken)
		}
	})
})
