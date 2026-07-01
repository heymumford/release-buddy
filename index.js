import getConfig from './src/getConfig.js'
import dispatch from './src/dispatch.js'
import createGitlabHandler from './src/gitlab/webhook.js'

const CONFIG_PATH = 'releaseBuddy.config.json'

/**
 * Release Buddy — Probot app (GitHub adapter) + GitLab webhook adapter.
 * On a published (non-draft, non-prerelease) GitHub release, or a GitLab
 * release-create webhook, notify the configured Slack channels, email
 * recipients, and Confluence space via the shared notifier core.
 *
 * @param {import('probot').Probot} app
 * @param {{addHandler?: Function}} [options] Probot Server options (v14)
 */
export default (app, { addHandler } = {}) => {
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

		await dispatch({
			log: app.log,
			config,
			releaseDetails: {
				name: release.name,
				body: release.body,
				url: release.html_url,
				version: release.tag_name,
			},
			repositoryName: repository.name,
		})
	})

	// GitLab adapter — same notifier core, different event source. Probot 14's
	// Server passes addHandler; it is absent in unit tests that call the app
	// function directly, so guard it.
	if (typeof addHandler === 'function') {
		addHandler(createGitlabHandler(app.log))
		app.log.info('GitLab webhook handler registered at POST /gitlab.')
	}
}
