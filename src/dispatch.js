import slackNotify from './slackNotify.js'
import sendMail from './sendMail.js'
import writeConfluence from './writeConfluence.js'

// Log a notifier failure without a second throw. SendGrid surfaces validation
// problems under error.response.body.errors, but network/timeout errors have no
// `response`, so read it defensively — and keep the original Error as `err` so
// the stack trace survives.
const logError = (log, message, error) =>
	log.error({ err: error, detail: error?.response?.body?.errors }, message)

/**
 * Run the enabled notifiers for a release. Platform-agnostic: both the GitHub
 * (Probot) and GitLab (webhook) adapters normalize their event to these inputs.
 * A failure in one notifier is logged and never stops the others.
 *
 * @param {object} args
 * @param {import('probot').Logger} args.log
 * @param {object} args.config       parsed releaseBuddy.config.json
 * @param {{name?: string, body?: string, url?: string, version?: string}} args.releaseDetails
 * @param {string} args.repositoryName
 */
export default async function dispatch({ log, config, releaseDetails, repositoryName }) {
	const { slackSettings, emailSettings, confluenceSettings, teamName } = config

	if (slackSettings?.enabled === true) {
		try {
			await slackNotify(slackSettings, repositoryName, releaseDetails, teamName)
			log.info('Slack notifications delivered.')
		} catch (error) {
			logError(log, 'Error delivering Slack notification.', error)
		}
	}

	if (emailSettings?.enabled === true) {
		try {
			await sendMail(emailSettings, releaseDetails, repositoryName, teamName)
			log.info('Email notifications delivered.')
		} catch (error) {
			logError(log, 'Error sending email.', error)
		}
	}

	if (confluenceSettings?.enabled === true) {
		try {
			await writeConfluence(confluenceSettings, releaseDetails, repositoryName, teamName)
			log.info('Confluence wiki page written.')
		} catch (error) {
			logError(log, 'Error writing Confluence wiki.', error)
		}
	}
}
