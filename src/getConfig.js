import { validateConfig } from './configSchema.js'

/**
 * Read and parse the repository's Release Buddy config file.
 * Returns the parsed object, or undefined if it is missing, unparseable, or
 * fails schema validation (logged loudly rather than silently mis-notifying).
 *
 * @param {import('probot').Logger} log
 * @param {import('probot').Context} context
 * @param {string} configPath
 */
const getConfig = async (log, context, configPath) => {
	log.info(`Loading configuration from ${configPath}.`)

	try {
		const file = await context.octokit.repos.getContent(context.repo({ path: configPath }))

		// A directory (or a symlink/submodule) comes back as an array or without
		// `content`; only a regular file carries base64 content we can parse.
		if (!file?.data || Array.isArray(file.data) || typeof file.data.content !== 'string') {
			log.warn(`${configPath} is not a readable file.`)
			return undefined
		}

		const parsed = JSON.parse(Buffer.from(file.data.content, 'base64').toString('utf8'))

		const { valid, errors } = validateConfig(parsed)
		if (!valid) {
			log.warn({ errors }, `${configPath} failed validation; skipping.`)
			return undefined
		}

		log.info('Configuration loaded.')
		return parsed
	} catch (error) {
		log.warn({ err: error }, `Could not load ${configPath}.`)
		return undefined
	}
}

export default getConfig
