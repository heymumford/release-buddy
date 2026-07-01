import { describe, test, expect } from 'vitest'
import { nextVersion } from '../../src/release/version.js'

describe('nextVersion', () => {
	test('major bump', () => {
		expect(nextVersion('1.2.3', 'major')).toBe('2.0.0')
	})
	test('minor bump', () => {
		expect(nextVersion('1.2.3', 'minor')).toBe('1.3.0')
	})
	test('patch bump', () => {
		expect(nextVersion('1.2.3', 'patch')).toBe('1.2.4')
	})
	test('tolerates a leading v', () => {
		expect(nextVersion('v0.4.9', 'minor')).toBe('0.5.0')
	})
	test('drops a pre-release/build suffix from the base before bumping', () => {
		expect(nextVersion('2.2.0-next.1', 'patch')).toBe('2.2.1')
		expect(nextVersion('2.2.0-next.1', 'minor')).toBe('2.3.0')
	})
	test('null level → null (no release)', () => {
		expect(nextVersion('1.2.3', null)).toBeNull()
	})
	test('throws on an unparseable version', () => {
		expect(() => nextVersion('not-a-version', 'patch')).toThrow(/version/i)
	})
})
