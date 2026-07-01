#!/usr/bin/env node
/**
 * Thin executable shim for the release-creation CLI. Supplies the real octokit
 * factory + adapters to the fully-tested, dependency-injected core in
 * src/release/cli.js, then maps the result to stdout + an exit code.
 *
 * Dry-run is the DEFAULT — a live GitHub release fires only with `--live` and a
 * GITHUB_TOKEN. See docs/adr/0004-release-creation-toolkit.md.
 *
 *   node bin/release.js --repo <owner/name>                 # dry run (default)
 *   GITHUB_TOKEN=… node bin/release.js --repo <o/n> --live  # create the release
 */
import { ProbotOctokit } from 'probot'
import { githubCommitsSinceLastTag } from '../src/release/github-commits.js'
import { createGithubRelease } from '../src/release/github.js'
import { runRelease } from '../src/release/run.js'
import { runReleaseCli } from '../src/release/cli.js'

const log = {
	info: (m) => console.log(m),
	warn: (m) => console.warn(m),
	error: (m) => console.error(m),
}

const result = await runReleaseCli({
	argv: process.argv.slice(2),
	env: process.env,
	log,
	now: () => new Date(),
	deps: {
		makeOctokit: (token) => new ProbotOctokit(token ? { auth: { token } } : {}),
		githubCommitsSinceLastTag,
		createGithubRelease,
		runRelease,
	},
})

// Diagnostics on failure go to stderr; stdout stays clean for pipeable output.
if (result.code === 0) console.log(result.message)
else console.error(result.message)
process.exit(result.code)
