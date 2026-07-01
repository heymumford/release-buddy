const slack = {
	enabled: true,
	slackWebhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
	userName: 'Release Buddy',
	channels: ['#releases'],
	iconEmoji: ':ship:',
	shipEmojis: ':ship: :rocket: :ship:',
}

const email = {
	enabled: true,
	to: { name: 'Release Buddy', email: 'no-reply@example.com' },
	from: { name: 'Release Buddy', email: 'releases@example.com' },
	bcc: ['team@example.com'],
}

const confluence = { enabled: true, space: 'REL', parentId: '12345' }

export const slackOnly = { teamName: 'Team', slackSettings: slack }
export const emailOnly = { teamName: 'Team', emailSettings: email }
export const confluenceOnly = { teamName: 'Team', confluenceSettings: confluence }
export const allThree = {
	teamName: 'Team',
	slackSettings: slack,
	emailSettings: email,
	confluenceSettings: confluence,
}
