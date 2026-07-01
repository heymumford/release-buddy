import slackNotify from './slackNotify.js'
import sendMail from './sendMail.js'
import writeConfluence from './writeConfluence.js'
import { withRetry } from './retry.js'

// Log a notifier failure without a second throw. SendGrid surfaces validation
// problems under error.response.body.errors, but network/timeout errors have no
// `response`, so read it defensively — and keep the original Error as `err` so
// the stack trace survives.
const logError = (log, message, error) =>
	log.error({ err: error, detail: error?.response?.body?.errors }, message)

const RETRIES = Number(process.env.NOTIFY_RETRIES) > 0 ? Number(process.env.NOTIFY_RETRIES) : 3

/**
 * Retry only clearly-transient failures (HTTP 429/5xx, network/timeout). Fail
 * fast on permanent errors — missing credentials, 4xx, validation — so we don't
 * hammer an endpoint that will never succeed.
 */
export const isTransient = (error) => {
	const msg = String(error?.message ?? '')
	if (/\b(429|5\d\d)\b/.test(msg)) return true
	return /(ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|fetch failed|network|timeout)/i.test(
		msg
	)
}

const deliver = (fn) => withRetry(fn, { retries: RETRIES, isRetryable: isTransient })

/**
 * Run the enabled notifiers for a release. Platform-agnostic: both the GitHub
 * (Probot) and GitLab (webhook) adapters normalize their event to these inputs.
 * Each notifier retries transient failures; a failure in one is logged and never
 * stops the others.
 */
export default async function dispatch({ log, config, releaseDetails, repositoryName }) {
	const { slackSettings, emailSettings, confluenceSettings, teamName } = config

	if (slackSettings?.enabled === true) {
		try {
			await deliver(() => slackNotify(slackSettings, repositoryName, releaseDetails, teamName))
			log.info('Slack notifications delivered.')
		} catch (error) {
			logError(log, 'Error delivering Slack notification.', error)
		}
	}

	if (emailSettings?.enabled === true) {
		try {
			await deliver(() => sendMail(emailSettings, releaseDetails, repositoryName, teamName))
			log.info('Email notifications delivered.')
		} catch (error) {
			logError(log, 'Error sending email.', error)
		}
	}

	if (confluenceSettings?.enabled === true) {
		try {
			await deliver(() =>
				writeConfluence(confluenceSettings, releaseDetails, repositoryName, teamName)
			)
			log.info('Confluence wiki page written.')
		} catch (error) {
			logError(log, 'Error writing Confluence wiki.', error)
		}
	}
}
