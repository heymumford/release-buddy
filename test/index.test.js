import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest'
import { Probot, ProbotOctokit } from 'probot'

import releasePayload from './fixtures/release.published.json' with { type: 'json' }
import { slackOnly, emailOnly, confluenceOnly, allThree } from './fixtures/configs.js'

// Mock the notifiers and config loader so index.js dispatch logic is tested in
// isolation (no network, no GitHub API).
vi.mock('../src/getConfig.js', () => ({ default: vi.fn() }))
vi.mock('../src/slackNotify.js', () => ({ default: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../src/sendMail.js', () => ({ default: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../src/writeConfluence.js', () => ({ default: vi.fn().mockResolvedValue(undefined) }))

import getConfig from '../src/getConfig.js'
import slackNotify from '../src/slackNotify.js'
import sendMail from '../src/sendMail.js'
import writeConfluence from '../src/writeConfluence.js'
import app from '../index.js'

const withRelease = (overrides) => ({
	...releasePayload,
	release: { ...releasePayload.release, ...overrides },
})

// pino's default transport doesn't initialize synchronously under vitest's
// worker pool, so probot.log can be null. Inject a deterministic stub.
const stubLog = () => {
	const log = {}
	for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal']) log[level] = () => {}
	log.child = () => log
	return log
}

describe('Release Buddy dispatch', () => {
	let probot

	beforeEach(() => {
		probot = new Probot({
			appId: 1,
			githubToken: 'test',
			log: stubLog(),
			Octokit: ProbotOctokit.defaults({
				retry: { enabled: false },
				throttle: { enabled: false },
			}),
		})
		app(probot)
	})

	afterEach(() => vi.clearAllMocks())

	const receive = (payload) => probot.receive({ name: 'release', payload })

	test('calls only the enabled notifiers (slack)', async () => {
		getConfig.mockResolvedValueOnce(slackOnly)
		await receive(releasePayload)
		expect(slackNotify).toHaveBeenCalledTimes(1)
		expect(sendMail).not.toHaveBeenCalled()
		expect(writeConfluence).not.toHaveBeenCalled()
	})

	test('calls only the enabled notifiers (email)', async () => {
		getConfig.mockResolvedValueOnce(emailOnly)
		await receive(releasePayload)
		expect(sendMail).toHaveBeenCalledTimes(1)
		expect(slackNotify).not.toHaveBeenCalled()
	})

	test('calls only the enabled notifiers (confluence)', async () => {
		getConfig.mockResolvedValueOnce(confluenceOnly)
		await receive(releasePayload)
		expect(writeConfluence).toHaveBeenCalledTimes(1)
		expect(slackNotify).not.toHaveBeenCalled()
	})

	test('calls all three when all are enabled', async () => {
		getConfig.mockResolvedValueOnce(allThree)
		await receive(releasePayload)
		expect(slackNotify).toHaveBeenCalledTimes(1)
		expect(sendMail).toHaveBeenCalledTimes(1)
		expect(writeConfluence).toHaveBeenCalledTimes(1)
	})

	test('does nothing when no config is present', async () => {
		getConfig.mockResolvedValueOnce(undefined)
		await receive(releasePayload)
		expect(slackNotify).not.toHaveBeenCalled()
		expect(sendMail).not.toHaveBeenCalled()
		expect(writeConfluence).not.toHaveBeenCalled()
	})

	test('skips pre-releases without loading config (issue #5)', async () => {
		await receive(withRelease({ prerelease: true }))
		expect(getConfig).not.toHaveBeenCalled()
		expect(slackNotify).not.toHaveBeenCalled()
	})

	test('skips drafts', async () => {
		await receive(withRelease({ draft: true }))
		expect(getConfig).not.toHaveBeenCalled()
		expect(slackNotify).not.toHaveBeenCalled()
	})

	test('a failing notifier does not stop the others', async () => {
		getConfig.mockResolvedValueOnce(allThree)
		slackNotify.mockRejectedValueOnce(new Error('slack down'))
		await receive(releasePayload)
		// email + confluence still fire despite slack throwing
		expect(sendMail).toHaveBeenCalledTimes(1)
		expect(writeConfluence).toHaveBeenCalledTimes(1)
	})

	test('a network-shaped error (no .response) is handled without a second throw', async () => {
		getConfig.mockResolvedValueOnce(emailOnly)
		sendMail.mockRejectedValueOnce(new Error('ECONNRESET')) // no .response.body.errors
		await expect(receive(releasePayload)).resolves.not.toThrow()
	})
})
