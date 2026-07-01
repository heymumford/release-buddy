// Lightweight, dependency-free validation for releaseBuddy.config.json.
// Tolerant Reader: unknown keys are allowed; only the shape of KNOWN fields is
// checked, so a typo'd type fails loudly instead of silently dropping a notice.

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isString = (v) => typeof v === 'string'
const isBoolean = (v) => typeof v === 'boolean'

/**
 * @param {unknown} config
 * @returns {{valid: boolean, errors: string[]}}
 */
export const validateConfig = (config) => {
	if (!isObject(config)) return { valid: false, errors: ['config must be an object'] }
	const errors = []

	if (config.teamName !== undefined && !isString(config.teamName)) {
		errors.push('teamName must be a string')
	}

	const settings = (key, check) => {
		const s = config[key]
		if (s === undefined) return
		if (!isObject(s)) {
			errors.push(`${key} must be an object`)
			return
		}
		if (s.enabled !== undefined && !isBoolean(s.enabled))
			errors.push(`${key}.enabled must be a boolean`)
		check(s)
	}

	settings('slackSettings', (s) => {
		if (s.channels !== undefined && !(Array.isArray(s.channels) || isString(s.channels))) {
			errors.push('slackSettings.channels must be an array or a string')
		}
		if (s.slackWebhookUrl !== undefined && !isString(s.slackWebhookUrl)) {
			errors.push('slackSettings.slackWebhookUrl must be a string')
		}
		if (s.slackWebhookUrlEnv !== undefined && !isString(s.slackWebhookUrlEnv)) {
			errors.push('slackSettings.slackWebhookUrlEnv must be a string')
		}
	})

	settings('emailSettings', (s) => {
		for (const field of ['to', 'from']) {
			const v = s[field]
			if (v !== undefined && !(isObject(v) || isString(v) || Array.isArray(v))) {
				errors.push(`emailSettings.${field} must be an object, string, or array`)
			}
		}
	})

	settings('confluenceSettings', (s) => {
		if (s.space !== undefined && !isString(s.space))
			errors.push('confluenceSettings.space must be a string')
		if (s.parentId !== undefined && !(isString(s.parentId) || typeof s.parentId === 'number')) {
			errors.push('confluenceSettings.parentId must be a string or number')
		}
	})

	settings('webhookSettings', (s) => {
		if (s.url !== undefined && !isString(s.url)) errors.push('webhookSettings.url must be a string')
		if (s.urlEnv !== undefined && !isString(s.urlEnv))
			errors.push('webhookSettings.urlEnv must be a string')
	})

	return { valid: errors.length === 0, errors }
}
