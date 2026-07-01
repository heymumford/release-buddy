import { describe, test, expect } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

// End-to-end smoke of the executable shim (bin/release.js). Proves the real
// probot ProbotOctokit import resolves and the exit-code wiring holds. The
// missing-repo path short-circuits before any network call, so this is
// deterministic and offline-safe.
describe('bin/release.js shim', () => {
	test('exits 2 with a usage message when --repo is missing (no network)', async () => {
		let err
		try {
			await run(process.execPath, ['bin/release.js'], { cwd: process.cwd() })
		} catch (e) {
			err = e
		}
		expect(err).toBeDefined()
		expect(err.code).toBe(2)
		// Errors go to stderr so stdout stays clean for pipeable output.
		expect(String(err.stderr)).toMatch(/repo/i)
		expect(String(err.stdout)).not.toMatch(/repo/i)
	})
})
