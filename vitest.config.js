import { defineConfig } from 'vitest/config'

// Coverage config only — test discovery keeps vitest defaults, so `npm test`
// is unaffected. `npm run test:coverage` emits lcov for SonarCloud import.
export default defineConfig({
	test: {
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			reportsDirectory: './coverage',
			include: ['index.js', 'src/**/*.js'],
			exclude: ['test/**', '**/*.config.js'],
		},
	},
})
