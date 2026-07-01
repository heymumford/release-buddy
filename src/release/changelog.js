import { parseCommit } from './commits.js'

// Conventional type → Keep a Changelog group. Types not listed here are omitted
// from the changelog (chore, docs, style, test, build, ci, etc.).
const GROUPS = [
	['Added', new Set(['feat'])],
	['Fixed', new Set(['fix'])],
	['Changed', new Set(['perf', 'refactor', 'revert'])],
]

const line = (commit) =>
	commit.scope ? `- **${commit.scope}:** ${commit.description}` : `- ${commit.description}`

/**
 * Build a Keep a Changelog section for a release from its commit messages.
 * Groups feat→Added, fix→Fixed, perf/refactor/revert→Changed, and surfaces any
 * breaking changes in their own section. Returns null when nothing is releasable.
 *
 * @param {string} version e.g. "1.3.0"
 * @param {string} date ISO date "YYYY-MM-DD"
 * @param {string[]} messages
 * @returns {string|null}
 */
export const generateChangelogSection = (version, date, messages) => {
	const commits = (messages ?? []).map(parseCommit).filter(Boolean)
	const breaking = commits.filter((c) => c.breaking)
	const grouped = GROUPS.map(([title, types]) => [title, commits.filter((c) => types.has(c.type))])

	const hasContent = breaking.length > 0 || grouped.some(([, list]) => list.length > 0)
	if (!hasContent) return null

	const blocks = [`## [${version}] - ${date}`]

	if (breaking.length) {
		blocks.push(`### ⚠ Breaking Changes\n\n${breaking.map(line).join('\n')}`)
	}
	for (const [title, list] of grouped) {
		if (list.length) blocks.push(`### ${title}\n\n${list.map(line).join('\n')}`)
	}

	return blocks.join('\n\n') + '\n'
}
