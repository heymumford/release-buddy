// Semver next-version computation from a bump level.

const CORE = /^v?(\d+)\.(\d+)\.(\d+)/

/**
 * Compute the next semantic version from the current one and a bump level.
 * A leading `v` and any `-prerelease`/`+build` suffix are stripped from the base
 * before bumping. Returns null when level is null (no release warranted).
 *
 * @param {string} current e.g. "1.2.3", "v0.4.9", "2.2.0-next.1"
 * @param {'major'|'minor'|'patch'|null} level
 * @returns {string|null}
 */
export const nextVersion = (current, level) => {
	if (level === null || level === undefined) return null
	const match = CORE.exec(String(current).trim())
	if (!match) throw new Error(`Unparseable version: ${current}`)
	let [, major, minor, patch] = match.map(Number)

	switch (level) {
		case 'major':
			return `${major + 1}.0.0`
		case 'minor':
			return `${major}.${minor + 1}.0`
		case 'patch':
			return `${major}.${minor}.${patch + 1}`
		default:
			throw new Error(`Unknown bump level: ${level}`)
	}
}
