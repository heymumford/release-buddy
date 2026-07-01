import getConfig from './src/getConfig.js'
import slackNotify from './src/slackNotify.js'
import sendMail from './src/sendMail.js'
import writeConfluence from './src/writeConfluence.js'

const CONFIG_PATH = 'releaseBuddy.config.json'

// Log a notifier failure without a second throw. SendGrid surfaces validation
// problems under error.response.body.errors, but network/timeout errors have no
// `response`, so read it defensively — and keep the original Error as `err` so
// the stack trace survives.
const logError = (app, message, error) =>
	app.log.error({ err: error, detail: error?.response?.body?.errors }, message)

/**
 * Release Buddy — Probot app.
 * On a published (non-draft, non-prerelease) release, notify the configured
 * Slack channels, email recipients, and Confluence space.
 *
 * @param {import('probot').Probot} app
 */
export default (app) => {
	app.log.info('Release Buddy loaded.')

	app.on('release.published', async (context) => {
		const { release, repository } = context.payload

		// A published pre-release or draft should not page the whole team.
		if (release.prerelease || release.draft) {
			app.log.info(`Skipping ${release.prerelease ? 'pre-release' : 'draft'} ${release.tag_name}.`)
			return
		}

		const config = await getConfig(app.log, context, CONFIG_PATH)
		if (!config) {
			app.log.warn(
				`No usable configuration at ${CONFIG_PATH}. Check that the file exists and is valid JSON.`
			)
			return
		}

		const releaseDetails = {
			name: release.name,
			body: release.body,
			url: release.html_url,
			version: release.tag_name,
		}

		const { slackSettings, emailSettings, confluenceSettings, teamName } = config
		const { name: repositoryName } = repository

		if (slackSettings?.enabled === true) {
			try {
				await slackNotify(slackSettings, repositoryName, releaseDetails, teamName)
				app.log.info('Slack notifications delivered.')
			} catch (error) {
				logError(app, 'Error delivering Slack notification.', error)
			}
		}

		if (emailSettings?.enabled === true) {
			try {
				await sendMail(emailSettings, releaseDetails, repositoryName, teamName)
				app.log.info('Email notifications delivered.')
			} catch (error) {
				logError(app, 'Error sending email.', error)
			}
		}

		if (confluenceSettings?.enabled === true) {
			try {
				await writeConfluence(confluenceSettings, releaseDetails, repositoryName, teamName)
				app.log.info('Confluence wiki page written.')
			} catch (error) {
				logError(app, 'Error writing Confluence wiki.', error)
			}
		}
	})
}
