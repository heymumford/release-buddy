import slackNotify from './slackNotify.js'
import sendMail from './sendMail.js'
import writeConfluence from './writeConfluence.js'
import webhookNotify from './webhookNotify.js'
import { withRetry } from './retry.js'
import { inc } from './metrics.js'

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
 * All log lines carry {repo, tag}; each notifier retries transient failures,
 * records a metric, and never stops the others on failure.
 */
export default async function dispatch({ log, config, releaseDetails, repositoryName }) {
	const { slackSettings, emailSettings, confluenceSettings, webhookSettings, teamName } = config

	const clog = log.child ? log.child({ repo: repositoryName, tag: releaseDetails?.version }) : log

	// One path per notifier: retry, log with context, record a metric.
	const notify = async (channel, fn, okMessage, errMessage) => {
		try {
			await deliver(fn)
			clog.info(okMessage)
			inc('notifications_sent_total', { channel, result: 'success' })
		} catch (error) {
			logError(clog, errMessage, error)
			inc('notifications_sent_total', { channel, result: 'failure' })
		}
	}

	if (slackSettings?.enabled === true) {
		await notify(
			'slack',
			() => slackNotify(slackSettings, repositoryName, releaseDetails, teamName),
			'Slack notifications delivered.',
			'Error delivering Slack notification.'
		)
	}

	if (emailSettings?.enabled === true) {
		await notify(
			'email',
			() => sendMail(emailSettings, releaseDetails, repositoryName, teamName),
			'Email notifications delivered.',
			'Error sending email.'
		)
	}

	if (confluenceSettings?.enabled === true) {
		await notify(
			'confluence',
			() => writeConfluence(confluenceSettings, releaseDetails, repositoryName, teamName),
			'Confluence wiki page written.',
			'Error writing Confluence wiki.'
		)
	}

	if (webhookSettings?.enabled === true) {
		await notify(
			'webhook',
			() => webhookNotify(webhookSettings, repositoryName, releaseDetails, teamName),
			'Webhook notification delivered.',
			'Error delivering webhook notification.'
		)
	}
}
