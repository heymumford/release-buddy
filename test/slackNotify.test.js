import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest'
import slackNotify from '../src/slackNotify.js'

const settings = {
	slackWebhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
	userName: 'Release Buddy',
	channels: ['#one', '#two', '#three'],
}
const release = { name: 'v1', body: '# notes', url: 'http://x/r', version: 'v1.0.0' }

const okResponse = () => ({ ok: true, status: 200, text: async () => 'ok' })

describe('slackNotify', () => {
	beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse())))
	afterEach(() => vi.unstubAllGlobals())

	test('posts to every configured channel and awaits them all (bug #1)', async () => {
		await slackNotify(settings, 'repo', release, 'Team')
		// The old forEach returned before any POST resolved; now all three complete.
		expect(fetch).toHaveBeenCalledTimes(3)
	})

	test('sends the release body as a Slack attachment', async () => {
		await slackNotify({ ...settings, channels: ['#one'] }, 'repo', release, 'Team')
		const body = JSON.parse(fetch.mock.calls[0][1].body)
		expect(body.channel).toBe('#one')
		expect(body.attachments[0].text).toContain('notes')
	})

	test('rejects when Slack returns a non-2xx response', async () => {
		fetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'boom' })
		await expect(
			slackNotify({ ...settings, channels: ['#one'] }, 'repo', release, 'Team')
		).rejects.toThrow(/500/)
	})

	test('throws when the webhook URL is missing', async () => {
		await expect(slackNotify({ channels: ['#one'] }, 'repo', release, 'Team')).rejects.toThrow(
			/slackWebhookUrl/
		)
	})
})
