import { slackifyMarkdown } from 'slackify-markdown'

/**
 * Post a release announcement to every configured Slack channel.
 * Resolves once all channels have been posted; rejects if any post fails so
 * the caller's try/catch can log it (the previous fire-and-forget forEach
 * swallowed every per-channel error).
 */
const slackNotify = async (slackSettings, repositoryName, releaseDetails, teamName) => {
	const { slackWebhookUrl, userName, channels, iconEmoji, shipEmojis } = slackSettings
	const { name: releaseName, body, url, version } = releaseDetails

	if (!slackWebhookUrl) {
		throw new Error('Missing slackWebhookUrl in Slack settings.')
	}

	const releaseNotes = slackifyMarkdown(body || '')
	const teamLine = teamName ? `*Team:* ${teamName} \n\n` : ''
	const releaseLine = releaseName ? `*Release Name:* ${releaseName} \n\n` : ''
	const ship = shipEmojis || ':ship: :ship: :ship: :ship: :ship:'

	const text = `${ship} \n\n${teamLine}*Repo:* ${repositoryName} \n\n*Version:* \`${version}\` \n\n${releaseLine}<${url}|View release on GitHub> \n\n${ship}\n\n *Release Notes:*`

	// Tolerate a single channel given as a string instead of an array, and fall
	// back to the webhook's default channel when none are configured.
	const list = Array.isArray(channels) ? channels : channels ? [channels] : []
	const targets = list.length ? list : [undefined]

	return Promise.all(
		targets.map(async (channel) => {
			const response = await fetch(slackWebhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					text,
					attachments: [{ text: releaseNotes }],
					username: userName || 'Release Buddy',
					icon_emoji: iconEmoji,
					channel,
				}),
			})

			if (!response.ok) {
				const detail = await response.text().catch(() => '')
				throw new Error(`Slack webhook responded ${response.status}${detail ? `: ${detail}` : ''}`)
			}

			return response
		})
	)
}

export default slackNotify
