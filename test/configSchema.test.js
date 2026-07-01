import { describe, test, expect } from 'vitest'
import { validateConfig } from '../src/configSchema.js'

const ok = (c) => expect(validateConfig(c).valid).toBe(true)
const bad = (c) => expect(validateConfig(c).valid).toBe(false)

describe('validateConfig', () => {
	test('a full valid config passes', () => {
		ok({
			teamName: 'Team',
			slackSettings: { enabled: true, slackWebhookUrlEnv: 'SLACK', channels: ['#a', '#b'] },
			emailSettings: { enabled: true, to: { email: 'x@y.z' }, from: { email: 'a@b.c' } },
			confluenceSettings: { enabled: true, space: 'REL', parentId: '123' },
		})
	})

	test('empty object is valid (all optional)', () => ok({}))

	test.each([null, undefined, 'string', 42, ['a']])('non-object %s is invalid', (c) => bad(c))

	test('teamName wrong type is invalid', () => bad({ teamName: 42 }))

	test('enabled must be boolean, not string', () => bad({ slackSettings: { enabled: 'true' } }))

	test('a *Settings that is not an object is invalid', () => bad({ slackSettings: 'nope' }))

	test('slack channels: array ok, string ok, object invalid', () => {
		ok({ slackSettings: { channels: ['#a'] } })
		ok({ slackSettings: { channels: '#a' } })
		bad({ slackSettings: { channels: { a: 1 } } })
	})

	test('email to: object ok, string ok, number invalid', () => {
		ok({ emailSettings: { to: { email: 'x@y.z' } } })
		ok({ emailSettings: { to: 'x@y.z' } })
		bad({ emailSettings: { to: 42 } })
	})

	test('confluence parentId: string ok, number ok, object invalid', () => {
		ok({ confluenceSettings: { parentId: '1' } })
		ok({ confluenceSettings: { parentId: 1 } })
		bad({ confluenceSettings: { parentId: {} } })
	})

	test('unknown keys are tolerated (Tolerant Reader)', () => {
		ok({ futureThing: { anything: true }, slackSettings: { enabled: true, extra: 1 } })
	})

	test('errors list names the offending field', () => {
		const { valid, errors } = validateConfig({ slackSettings: { enabled: 1 } })
		expect(valid).toBe(false)
		expect(errors.join(' ')).toMatch(/slackSettings\.enabled/)
	})
})
