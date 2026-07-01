import { describe, test, expect, beforeEach } from 'vitest'
import { inc, render, reset, createMetricsHandler } from '../src/metrics.js'

beforeEach(() => reset())

describe('metrics registry', () => {
	test('renders Prometheus text exposition format with HELP and TYPE', () => {
		inc('releases_created_total')
		const out = render()
		expect(out).toContain('# HELP releases_created_total')
		expect(out).toContain('# TYPE releases_created_total counter')
		expect(out).toContain('releases_created_total 1')
		expect(out.endsWith('\n')).toBe(true)
	})

	test('accumulates counts per label set', () => {
		inc('notifications_sent_total', { channel: 'slack', result: 'success' })
		inc('notifications_sent_total', { channel: 'slack', result: 'success' })
		inc('notifications_sent_total', { channel: 'email', result: 'failure' })
		const out = render()
		expect(out).toContain('notifications_sent_total{channel="slack",result="success"} 2')
		expect(out).toContain('notifications_sent_total{channel="email",result="failure"} 1')
	})

	test('groups a HELP/TYPE header once per metric name', () => {
		inc('notifications_sent_total', { channel: 'slack', result: 'success' })
		inc('notifications_sent_total', { channel: 'email', result: 'success' })
		const out = render()
		expect(out.match(/# TYPE notifications_sent_total counter/g)).toHaveLength(1)
	})

	test('reset clears the registry', () => {
		inc('releases_created_total')
		reset()
		expect(render()).toBe('')
	})
})

describe('createMetricsHandler', () => {
	const mkRes = () => ({
		status: null,
		headers: null,
		body: null,
		writeHead(s, h) {
			this.status = s
			this.headers = h
		},
		end(b) {
			this.body = b
		},
	})

	test('serves GET /metrics as text/plain', async () => {
		inc('releases_created_total')
		const res = mkRes()
		const handled = await createMetricsHandler()({ method: 'GET', url: '/metrics' }, res)
		expect(handled).toBe(true)
		expect(res.status).toBe(200)
		expect(res.headers['content-type']).toMatch(/text\/plain/)
		expect(res.body).toContain('releases_created_total 1')
	})

	test('ignores other paths/methods (returns false)', async () => {
		const res = mkRes()
		expect(await createMetricsHandler()({ method: 'POST', url: '/metrics' }, res)).toBe(false)
		expect(await createMetricsHandler()({ method: 'GET', url: '/other' }, res)).toBe(false)
	})
})
