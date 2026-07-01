import sgMail from '@sendgrid/mail'
import removeMd from 'remove-markdown'
import { marked } from 'marked'

if (process.env.SENDGRID_API_KEY) {
	sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

// Render headings as bold so the email keeps release-note emphasis without
// pulling in heading sizes that clash with mail clients.
const boldenHeadings = (html) => html.replace(/<(\/?)h[1-6]>/gi, '<$1strong>')

/**
 * Send the release notes as an email via SendGrid.
 */
const sendMail = async (emailSettings, releaseDetails, repositoryName, teamName) => {
	if (!process.env.SENDGRID_API_KEY) {
		throw new Error('Missing SENDGRID_API_KEY environment variable.')
	}

	const { from, to, bcc } = emailSettings
	const { name: releaseName, body, url, version } = releaseDetails

	// `from` must carry an email; `to` may be a string, an object, or an array,
	// so only require it to be present.
	if (!from?.email || !to) {
		throw new Error(
			'Missing required fields (from.email, to) to send email. Check your configuration.'
		)
	}

	const html = boldenHeadings(marked.parse(body || '', { async: false }))
	const plainText = removeMd(body || '')
	const subject = `Release: ${teamName} ${repositoryName} (${version}): ${releaseName}`

	return sgMail.send({
		to,
		bcc,
		from,
		subject,
		text: `${plainText}\n\nView on GitHub: ${url}`,
		html: `<strong><u>Release Notes:</u></strong><br/><br/>${html}`,
	})
}

export default sendMail
