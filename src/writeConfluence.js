import { marked } from 'marked'

const pad = (n) => String(n).padStart(2, '0')

// YYYY-MM-DD in UTC. Both month and day are zero-padded (the previous version
// padded only the month, producing titles like "2026-06-5").
const isoDate = (d = new Date()) =>
	`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`

/**
 * Create a Confluence page for the release under the configured space/parent.
 * Uses the Confluence REST API directly; awaits the request so failures reject
 * (the old callback-based path let errors escape the caller's try/catch).
 */
const writeConfluence = async (settings, releaseDetails, repositoryName, teamName) => {
	const user = process.env.CONFLUENCE_USER
	const apiKey = process.env.CONFLUENCE_API_KEY
	const baseUrl = process.env.CONFLUENCE_BASE_URL

	if (!user || !apiKey || !baseUrl) {
		throw new Error('Missing Confluence environment variables.')
	}

	const { space, parentId } = settings
	const { name, body, version } = releaseDetails

	const teamLine = teamName ? `<p><strong>Team: ${teamName}</strong></p>` : ''
	const releaseLine = name ? `<p><strong>Release Name: ${name}</strong></p>` : ''
	const html = `${teamLine}${releaseLine}<p><strong>Notes:</strong></p>${marked.parse(body || '', { async: false })}`

	const title = `${isoDate()} - ${repositoryName} ${version}`

	const payload = {
		type: 'page',
		title,
		space: { key: space },
		body: { storage: { value: html, representation: 'storage' } },
		...(parentId ? { ancestors: [{ id: String(parentId) }] } : {}),
	}

	const auth = Buffer.from(`${user}:${apiKey}`).toString('base64')
	const response = await fetch(`${baseUrl.replace(/\/$/, '')}/rest/api/content`, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${auth}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	})

	if (!response.ok) {
		const detail = await response.text().catch(() => '')
		throw new Error(`Confluence responded ${response.status}${detail ? `: ${detail}` : ''}`)
	}

	return response.json()
}

export default writeConfluence
