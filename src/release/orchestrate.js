import { bumpLevel } from './commits.js'
import { nextVersion } from './version.js'
import { generateChangelogSection } from './changelog.js'

/**
 * Pure release plan: given the commits since the last release and the current
 * version, decide whether to release and compute the next version + changelog.
 * Composes slices 1–3; no I/O, so it is fully deterministic and testable.
 *
 * @param {object} args
 * @param {string} args.currentVersion
 * @param {string[]} args.commits commit messages since the last release
 * @param {string} args.date ISO date "YYYY-MM-DD" for the changelog header
 * @returns {{shouldRelease: false} | {shouldRelease: true, level: string, version: string, changelog: string}}
 */
export const planRelease = ({ currentVersion, commits, date }) => {
	const level = bumpLevel(commits)
	if (!level) return { shouldRelease: false }

	const version = nextVersion(currentVersion, level)
	const changelog = generateChangelogSection(version, date, commits)
	return { shouldRelease: true, level, version, changelog }
}
