/**
 * CLI wiring for the release-creation toolkit. Fully dependency-injected so it
 * is deterministic and never touches the network in tests. The thin executable
 * shim lives at bin/release.js and supplies the real octokit + adapters.
 *
 * SAFETY: dry-run is the DEFAULT. A live release (real GitHub create) fires
 * only when `--live` is passed. In dry-run the network create adapter is never
 * invoked — the plan is computed and printed, nothing is created.
 */

const TAG_PREFIX = 'v'

/**
 * Parse argv into options. Fails closed: a malformed argument sets `opts.error`
 * so the caller refuses (exit 2) rather than proceeding against a mis-parsed
 * target. Never resolves to a repo the user did not type.
 *
 * @param {string[]} argv
 */
const parseArgs = (argv) => {
	const opts = { live: false }
	// A flag that expects a value must not swallow the next flag as its value.
	const value = (name, v) => {
		if (v === undefined || String(v).startsWith('--')) {
			opts.error = `Missing value for ${name}.`
			return undefined
		}
		return v
	}
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i]
		if (a === '--live' || a === '--no-dry-run') opts.live = true
		else if (a === '--repo') opts.repo = value('--repo', argv[++i])
		else if (a === '--owner') opts.owner = value('--owner', argv[++i])
		else if (a === '--current-version') opts.currentVersion = value('--current-version', argv[++i])
	}
	if (!opts.error && opts.repo && opts.repo.includes('/')) {
		const parts = opts.repo.split('/')
		if (parts.length !== 2 || !parts[0] || !parts[1]) {
			opts.error = `Invalid --repo "${opts.repo}"; expected <owner>/<name>.`
		} else if (opts.owner && opts.owner !== parts[0]) {
			opts.error = `--owner "${opts.owner}" conflicts with --repo "${opts.repo}".`
		} else {
			opts.owner = opts.owner || parts[0]
			opts.repo = parts[1]
		}
	}
	return opts
}

const USAGE = 'Usage: release --repo <owner/name> [--owner <name>] [--live] [--current-version X].'

/**
 * @param {object} args
 * @param {string[]} args.argv process.argv.slice(2)
 * @param {Record<string,string|undefined>} args.env
 * @param {{info:Function,warn:Function,error:Function}} args.log
 * @param {() => Date} args.now
 * @param {object} args.deps injected I/O adapters + orchestrator
 * @returns {Promise<{code:number, dryRun:boolean, released:boolean, version?:string, url?:string, message:string}>}
 */
export const runReleaseCli = async ({ argv, env, log, now, deps }) => {
	const { makeOctokit, githubCommitsSinceLastTag, createGithubRelease, runRelease } = deps
	const opts = parseArgs(argv)
	const dryRun = !opts.live

	if (opts.error) {
		return { code: 2, dryRun, released: false, message: `${opts.error} ${USAGE}` }
	}
	if (!opts.owner || !opts.repo) {
		// Name the piece that is actually missing — --repo <name> with no owner is
		// a missing OWNER, not a missing --repo.
		const missing = !opts.repo
			? 'Missing --repo.'
			: 'Missing owner — pass --repo <owner>/<name> or --owner <name>.'
		return { code: 2, dryRun, released: false, message: `${missing} ${USAGE}` }
	}

	if (opts.live && !env.GITHUB_TOKEN) {
		return {
			code: 2,
			dryRun: false,
			released: false,
			message:
				'Refusing --live release without GITHUB_TOKEN. Set the token, or drop --live for a dry run.',
		}
	}

	// In dry-run, wrap the logger so runRelease's own "Created release …" line
	// can never be mistaken for a real one.
	if (dryRun) log.info('Dry run — computing the release plan; nothing will be created.')
	const runLog = dryRun ? { ...log, info: (m) => log.info(`[dry-run] ${m}`) } : log

	const octokit = makeOctokit(env.GITHUB_TOKEN)

	try {
		const { lastTag, commits } = await githubCommitsSinceLastTag(octokit, {
			owner: opts.owner,
			repo: opts.repo,
		})
		const currentVersion = opts.currentVersion || (lastTag ? lastTag.replace(/^v/, '') : '0.0.0')
		const date = now().toISOString().slice(0, 10)

		const createRelease = dryRun
			? async ({ version, changelog }) => {
					// Preview the notes so a dry run is useful before committing to --live.
					log.info(`\n${changelog}`)
					return { url: '(dry-run — not created)', tag: `${TAG_PREFIX}${version}` }
				}
			: async ({ version, changelog }) =>
					createGithubRelease(octokit, {
						owner: opts.owner,
						repo: opts.repo,
						tagName: `${TAG_PREFIX}${version}`,
						body: changelog,
					})

		const result = await runRelease({
			log: runLog,
			currentVersion,
			date,
			getCommits: async () => ({ lastTag, commits }),
			createRelease,
		})

		if (!result.released) {
			return {
				code: 0,
				dryRun,
				released: false,
				message: 'No releasable commits since the last release.',
			}
		}
		return {
			code: 0,
			dryRun,
			released: true,
			version: result.version,
			url: result.release.url,
			message: dryRun
				? `Dry run: would release ${result.version} (nothing created).`
				: `Released ${result.version}: ${result.release.url}`,
		}
	} catch (err) {
		// GitHub API failure (bad repo, auth, rate limit, network). Report a clean
		// line + exit 1 instead of leaking a raw stack trace. status is octokit's.
		const status = err && err.status ? ` (HTTP ${err.status})` : ''
		const reason = (err && err.message) || String(err)
		return {
			code: 1,
			dryRun,
			released: false,
			message: `GitHub request failed for ${opts.owner}/${opts.repo}${status}: ${reason}`,
		}
	}
}
