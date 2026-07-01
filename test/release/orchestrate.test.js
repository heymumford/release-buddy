import { describe, test, expect } from 'vitest'
import { planRelease } from '../../src/release/orchestrate.js'

describe('planRelease', () => {
	test('no releasable commits → shouldRelease false', () => {
		expect(
			planRelease({ currentVersion: '1.2.3', commits: ['chore: x'], date: '2026-07-01' })
		).toEqual({ shouldRelease: false })
	})

	test('feat → minor bump with a changelog', () => {
		const plan = planRelease({
			currentVersion: '1.2.3',
			commits: ['feat: add teams', 'fix: bug'],
			date: '2026-07-01',
		})
		expect(plan.shouldRelease).toBe(true)
		expect(plan.level).toBe('minor')
		expect(plan.version).toBe('1.3.0')
		expect(plan.changelog).toContain('## [1.3.0] - 2026-07-01')
		expect(plan.changelog).toContain('add teams')
	})

	test('breaking → major bump', () => {
		const plan = planRelease({
			currentVersion: '1.2.3',
			commits: ['feat!: drop v1'],
			date: '2026-07-01',
		})
		expect(plan.level).toBe('major')
		expect(plan.version).toBe('2.0.0')
	})

	test('fix only → patch bump', () => {
		const plan = planRelease({
			currentVersion: '0.4.9',
			commits: ['fix: a'],
			date: '2026-07-01',
		})
		expect(plan.version).toBe('0.4.10')
	})
})
