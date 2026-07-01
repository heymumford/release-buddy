import { describe, test, expect, vi } from 'vitest'
import { withRetry } from '../src/retry.js'

const noSleep = vi.fn().mockResolvedValue(undefined)

describe('withRetry', () => {
	test('returns the result on first success (no retry)', async () => {
		const fn = vi.fn().mockResolvedValue('ok')
		expect(await withRetry(fn, { sleep: noSleep })).toBe('ok')
		expect(fn).toHaveBeenCalledTimes(1)
		expect(noSleep).not.toHaveBeenCalled()
	})

	test('retries a transient failure then succeeds', async () => {
		const fn = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue('ok')
		expect(await withRetry(fn, { retries: 3, sleep: noSleep })).toBe('ok')
		expect(fn).toHaveBeenCalledTimes(2)
	})

	test('throws the last error after exhausting retries', async () => {
		const fn = vi.fn().mockRejectedValue(new Error('always'))
		await expect(withRetry(fn, { retries: 3, sleep: noSleep })).rejects.toThrow('always')
		expect(fn).toHaveBeenCalledTimes(3)
	})

	test('does not retry a non-retryable error', async () => {
		const fn = vi.fn().mockRejectedValue(Object.assign(new Error('4xx'), { retryable: false }))
		await expect(
			withRetry(fn, { retries: 3, sleep: noSleep, isRetryable: (e) => e.retryable !== false })
		).rejects.toThrow('4xx')
		expect(fn).toHaveBeenCalledTimes(1)
	})

	test('backs off with exponential delays', async () => {
		const sleep = vi.fn().mockResolvedValue(undefined)
		const fn = vi.fn().mockRejectedValue(new Error('x'))
		await expect(withRetry(fn, { retries: 3, baseMs: 100, sleep })).rejects.toThrow()
		expect(sleep.mock.calls.map((c) => c[0])).toEqual([100, 200])
	})

	test('passes the attempt number to fn', async () => {
		const fn = vi.fn().mockRejectedValueOnce(new Error('a')).mockResolvedValue('ok')
		await withRetry(fn, { sleep: noSleep })
		expect(fn.mock.calls[0][0]).toBe(1)
		expect(fn.mock.calls[1][0]).toBe(2)
	})
})
