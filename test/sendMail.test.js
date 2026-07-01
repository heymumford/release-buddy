import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest'

vi.mock('@sendgrid/mail', () => ({
	default: { setApiKey: vi.fn(), send: vi.fn().mockResolvedValue([{ statusCode: 202 }]) },
}))

import sgMail from '@sendgrid/mail'
import sendMail from '../src/sendMail.js'

const email = {
	to: { name: 'To', email: 'to@example.com' },
	from: { name: 'From', email: 'from@example.com' },
	bcc: ['b@example.com'],
}
const release = { name: 'v1', body: '# Heading\n\nbody', url: 'http://x/r', version: 'v1.0.0' }

describe('sendMail', () => {
	beforeEach(() => vi.stubEnv('SENDGRID_API_KEY', 'test-key'))
	afterEach(() => {
		vi.unstubAllEnvs()
		vi.clearAllMocks()
	})

	test('sends a message with subject and rendered html', async () => {
		await sendMail(email, release, 'repo', 'Team')
		expect(sgMail.send).toHaveBeenCalledTimes(1)
		const msg = sgMail.send.mock.calls[0][0]
		expect(msg.subject).toBe('Release: Team repo (v1.0.0): v1')
		expect(msg.to).toEqual(email.to)
		expect(msg.html).toContain('Release Notes')
		expect(msg.text).toContain('View on GitHub')
	})

	test('renders markdown headings as bold, not <h1>', async () => {
		await sendMail(email, release, 'repo', 'Team')
		const msg = sgMail.send.mock.calls[0][0]
		expect(msg.html).not.toMatch(/<h[1-6]>/i)
		expect(msg.html).toContain('<strong>')
	})

	test('throws when required fields are missing', async () => {
		await expect(sendMail({ to: email.to }, release, 'repo', 'Team')).rejects.toThrow(
			/required fields/
		)
	})

	test('throws when from is present but has no email address', async () => {
		await expect(
			sendMail({ to: email.to, from: { name: 'No Email' } }, release, 'repo', 'Team')
		).rejects.toThrow(/required fields/)
	})

	test('throws when the SendGrid key is missing', async () => {
		vi.stubEnv('SENDGRID_API_KEY', '')
		await expect(sendMail(email, release, 'repo', 'Team')).rejects.toThrow(/SENDGRID_API_KEY/)
	})
})
