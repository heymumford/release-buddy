/**
 * Post a release announcement as a generic JSON webhook — the one code path that
 * reaches Discord, Opsgenie, Microsoft Teams (incoming webhook), or any custom
 * endpoint. The URL comes from webhookSettings.url or (preferred, secret-free)
 * webhookSettings.urlEnv. Throws on a non-2xx response so dispatch's retry
 * wrapper treats a transient failure as retryable.
 */
const webhookNotify = async (webhookSettings, repositoryName, releaseDetails, teamName) => {
	const { url, urlEnv } = webhookSettings
	const target = urlEnv ? process.env[urlEnv] : url

	if (!target) {
		throw new Error(
			urlEnv
				? `Webhook env var ${urlEnv} is not set.`
				: 'Missing webhook url: set webhookSettings.url (or urlEnv).'
		)
	}

	const { name, body, url: releaseUrl, version } = releaseDetails
	const response = await fetch(target, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			repo: repositoryName,
			team: teamName,
			version,
			name,
			url: releaseUrl,
			body,
		}),
	})

	if (!response.ok) {
		const detail = await response.text().catch(() => '')
		throw new Error(`Webhook responded ${response.status}${detail ? `: ${detail}` : ''}`)
	}

	return response
}

export default webhookNotify
