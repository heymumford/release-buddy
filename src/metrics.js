// Minimal in-process counter registry rendering the Prometheus text exposition
// format (https://prometheus.io/docs/instrumenting/exposition_formats/). No
// dependency; enough for a small single-instance app.

const counters = new Map() // key -> { name, labels, value }

const HELP = {
	notifications_sent_total: 'Release notifications attempted, by channel and result.',
	releases_created_total: 'Releases created by the toolkit.',
}

const labelKey = (labels) =>
	Object.keys(labels)
		.sort()
		.map((k) => `${k}=${labels[k]}`)
		.join(',')

/** Increment a counter (by `by`, default 1) for the given label set. */
export const inc = (name, labels = {}, by = 1) => {
	const k = `${name}|${labelKey(labels)}`
	const existing = counters.get(k)
	if (existing) existing.value += by
	else counters.set(k, { name, labels, value: by })
}

/** Clear all counters (tests). */
export const reset = () => counters.clear()

/** Render all counters in Prometheus text exposition format. */
export const render = () => {
	const byName = new Map()
	for (const c of counters.values()) {
		if (!byName.has(c.name)) byName.set(c.name, [])
		byName.get(c.name).push(c)
	}

	const lines = []
	for (const [name, series] of byName) {
		lines.push(`# HELP ${name} ${HELP[name] ?? name}`)
		lines.push(`# TYPE ${name} counter`)
		for (const c of series) {
			const labels = Object.keys(c.labels)
				.sort()
				.map((k) => `${k}="${c.labels[k]}"`)
				.join(',')
			lines.push(`${name}${labels ? `{${labels}}` : ''} ${c.value}`)
		}
	}

	return lines.length ? lines.join('\n') + '\n' : ''
}

/**
 * Raw-HTTP handler (Probot Server.addHandler) exposing GET /metrics. Returns
 * true when it handled the request, false to let other handlers run.
 */
export const createMetricsHandler = () => async (req, res) => {
	if (req.method !== 'GET' || (req.url || '').split('?')[0] !== '/metrics') return false
	res.writeHead(200, { 'content-type': 'text/plain; version=0.0.4' })
	res.end(render())
	return true
}
