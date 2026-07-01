const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Retry an async function with bounded exponential backoff. Used to wrap
 * transient notifier failures (429/5xx/network) so a blip doesn't silently drop
 * a release notice. `sleep` is injectable so tests run without real timers.
 *
 * @template T
 * @param {(attempt: number) => Promise<T>} fn
 * @param {object} [opts]
 * @param {number} [opts.retries=3] total attempts (not additional retries)
 * @param {number} [opts.baseMs=200] first backoff; doubles each attempt
 * @param {(error: unknown) => boolean} [opts.isRetryable] default: retry all
 * @param {(ms: number) => Promise<void>} [opts.sleep]
 * @returns {Promise<T>}
 */
export const withRetry = async (
	fn,
	{ retries = 3, baseMs = 200, isRetryable = () => true, sleep = defaultSleep } = {}
) => {
	let lastError
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			return await fn(attempt)
		} catch (error) {
			lastError = error
			if (attempt === retries || !isRetryable(error)) throw error
			await sleep(baseMs * 2 ** (attempt - 1))
		}
	}
	throw lastError
}
