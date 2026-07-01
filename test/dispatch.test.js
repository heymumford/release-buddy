import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../src/slackNotify.js', () => ({ default: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../src/sendMail.js', () => ({ default: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../src/writeConfluence.js', () => ({ default: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../src/webhookNotify.js', () => ({ default: vi.fn().mockResolvedValue(undefined) }))

import slackNotify from '../src/slackNotify.js'
import sendMail from '../src/sendMail.js'
import writeConfluence from '../src/writeConfluence.js'
import webhookNotify from '../src/webhookNotify.js'
import dispatch from '../src/dispatch.js'

const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
const releaseDetails = { name: 'v1', body: 'b', url: 'u', version: 'v1.0.0' }
const run = (config) => dispatch({ log, config, releaseDetails, repositoryName: 'repo' })

beforeEach(() => vi.clearAllMocks())

describe('dispatch (shared notifier core)', () => {
	test('runs only the enabled notifiers', async () => {
		await run({ slackSettings: { enabled: true } })
		expect(slackNotify).toHaveBeenCalledTimes(1)
		expect(sendMail).not.toHaveBeenCalled()
		expect(writeConfluence).not.toHaveBeenCalled()
	})

	test('runs all three when all enabled', async () => {
		await run({
			slackSettings: { enabled: true },
			emailSettings: { enabled: true },
			confluenceSettings: { enabled: true },
		})
		expect(slackNotify).toHaveBeenCalledTimes(1)
		expect(sendMail).toHaveBeenCalledTimes(1)
		expect(writeConfluence).toHaveBeenCalledTimes(1)
	})

	test('a failing notifier does not stop the others', async () => {
		slackNotify.mockRejectedValueOnce(new Error('slack down'))
		await run({
			slackSettings: { enabled: true },
			emailSettings: { enabled: true },
			confluenceSettings: { enabled: true },
		})
		expect(sendMail).toHaveBeenCalledTimes(1)
		expect(writeConfluence).toHaveBeenCalledTimes(1)
		expect(log.error).toHaveBeenCalled()
	})

	test('a network-shaped error (no .response) is logged without a second throw', async () => {
		sendMail.mockRejectedValueOnce(new Error('ECONNRESET'))
		await expect(run({ emailSettings: { enabled: true } })).resolves.not.toThrow()
	})

	test('passes releaseDetails and repositoryName through to notifiers', async () => {
		await run({ slackSettings: { enabled: true } })
		expect(slackNotify).toHaveBeenCalledWith({ enabled: true }, 'repo', releaseDetails, undefined)
	})

	test('calls the webhook notifier when webhookSettings is enabled', async () => {
		await run({ webhookSettings: { enabled: true, url: 'https://hook/x' } })
		expect(webhookNotify).toHaveBeenCalledTimes(1)
		expect(slackNotify).not.toHaveBeenCalled()
	})

	test('retries a transient (5xx) notifier failure then succeeds', async () => {
		slackNotify
			.mockRejectedValueOnce(new Error('Slack webhook responded 503'))
			.mockResolvedValueOnce(undefined)
		await run({ slackSettings: { enabled: true } })
		expect(slackNotify).toHaveBeenCalledTimes(2)
		expect(log.error).not.toHaveBeenCalled()
	})

	test('does not retry a permanent notifier failure (fails fast, logged once)', async () => {
		slackNotify.mockRejectedValue(new Error('Missing Slack webhook: set slackWebhookUrlEnv'))
		await run({ slackSettings: { enabled: true } })
		expect(slackNotify).toHaveBeenCalledTimes(1)
		expect(log.error).toHaveBeenCalledTimes(1)
	})
})
