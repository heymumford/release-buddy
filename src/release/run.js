import { planRelease } from './orchestrate.js'

/**
 * Create-then-announce release flow. Fully dependency-injected — `getCommits`,
 * `createRelease`, and `notify` are supplied by the caller (GitHub or GitLab
 * adapters), so this orchestration is pure, deterministic, and never touches a
 * real repo on its own.
 *
 * @param {object} args
 * @param {import('probot').Logger} args.log
 * @param {string} args.currentVersion
 * @param {string} args.date ISO date for the changelog header
 * @param {() => Promise<{lastTag: string|null, commits: string[]}>} args.getCommits
 * @param {(plan: {version: string, changelog: string}) => Promise<object>} args.createRelease
 * @param {(info: {version: string, changelog: string, release: object}) => Promise<void>} [args.notify]
 * @returns {Promise<{released: false} | {released: true, version: string, release: object}>}
 */
export const runRelease = async ({
	log,
	currentVersion,
	date,
	getCommits,
	createRelease,
	notify,
}) => {
	const { commits } = await getCommits()
	const plan = planRelease({ currentVersion, commits, date })

	if (!plan.shouldRelease) {
		log.info('No releasable commits since the last release; skipping.')
		return { released: false }
	}

	const release = await createRelease({ version: plan.version, changelog: plan.changelog })
	log.info(`Created release ${plan.version}.`)

	if (notify) {
		await notify({ version: plan.version, changelog: plan.changelog, release })
	}

	return { released: true, version: plan.version, release }
}
