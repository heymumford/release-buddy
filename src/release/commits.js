// Conventional Commits parsing → semver bump level.
// https://www.conventionalcommits.org/en/v1.0.0/

const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<bang>!)?: (?<description>.+)$/i
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:/m

// Types that trigger a release, and the bump each implies on its own.
const PATCH_TYPES = new Set(['fix', 'perf'])
const MINOR_TYPES = new Set(['feat'])

/**
 * Parse one commit message into its conventional-commit parts, or null if the
 * header is not a conventional commit.
 *
 * @param {string} message full commit message (header + optional body/footers)
 * @returns {{type: string, scope: string|null, breaking: boolean, description: string} | null}
 */
export const parseCommit = (message) => {
	if (!message) return null
	const [header] = String(message).split('\n', 1)
	const match = HEADER.exec(header)
	if (!match) return null
	const { type, scope, bang, description } = match.groups
	return {
		type: type.toLowerCase(),
		scope: scope ?? null,
		breaking: Boolean(bang) || BREAKING_FOOTER.test(String(message)),
		description,
	}
}

/**
 * Determine the semver bump implied by a set of commit messages.
 * Breaking → major; feat → minor; fix/perf → patch; nothing releasable → null.
 *
 * @param {string[]} messages
 * @returns {'major'|'minor'|'patch'|null}
 */
export const bumpLevel = (messages) => {
	let level = null
	for (const message of messages ?? []) {
		const commit = parseCommit(message)
		if (!commit) continue
		if (commit.breaking) return 'major'
		if (MINOR_TYPES.has(commit.type)) level = 'minor'
		else if (PATCH_TYPES.has(commit.type) && level !== 'minor') level = 'patch'
	}
	return level
}
