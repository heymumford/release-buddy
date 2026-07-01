# Release Buddy

Release Buddy is a [GitHub App](https://probot.github.io) that fans out release
notes when you publish a GitHub release. When a release is published, it can:

- post to one or more **Slack** channels,
- send an **email** via SendGrid, and
- create a **Confluence** page.

Each notifier is opt-in per repository through a `releaseBuddy.config.json` file.

> Modernized fork of [`ecobee/release-buddy`](https://github.com/ecobee/release-buddy)
> (ISC). This fork targets Probot 14, Node 20+, and ESM; drops the abandoned
> Google Cloud Functions deployment path; replaces the callback-based Confluence
> client with the Confluence REST API; and fixes several notification bugs.

## How it works

`index.js` is the Probot app. It listens for `release.published` and dispatches
to the enabled notifiers in `src/`:

| File                     | Responsibility                                          |
| ------------------------ | ------------------------------------------------------- |
| `src/getConfig.js`       | Read `releaseBuddy.config.json` from the releasing repo |
| `src/slackNotify.js`     | Post to every configured Slack channel                  |
| `src/sendMail.js`        | Send the release notes via SendGrid                     |
| `src/writeConfluence.js` | Create a Confluence page for the release                |

Draft and pre-release publishes are ignored so they don't page the whole team.

## Local development

Requires Node 20+ (see `.nvmrc`).

```sh
npm install
cp .env.example .env   # fill in your GitHub App + notifier credentials
npm start              # or: npm run dev  (auto-reload)
```

Follow the Probot startup URL to register a GitHub App, point its webhook at
your [smee.io](https://smee.io/new) proxy, and set `WEBHOOK_PROXY_URL` in `.env`.

Run the tests:

```sh
npm test               # vitest
npm run test:coverage  # with coverage
npm run lint           # prettier --check
```

## Deployment

Release Buddy runs as a standard Probot Node server — deploy it anywhere that
runs a container or a Node process.

```sh
docker build -t release-buddy .
docker run -p 3000:3000 --env-file .env release-buddy
```

Set the GitHub App webhook URL to your deployment's `/api/github/webhooks`
endpoint.

## Per-repository configuration

Add a `releaseBuddy.config.json` to the root of each repo you want notified:

```jsonc
{
	"teamName": "Consumer Website Team",
	"slackSettings": {
		"enabled": true,
		"slackWebhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
		"userName": "Release Buddy",
		"channels": ["#releases", "#team-web"],
		"iconEmoji": ":ship:",
		"shipEmojis": ":ship: :rocket: :ship:",
	},
	"emailSettings": {
		"enabled": true,
		"to": { "name": "Release Buddy", "email": "no-reply@example.com" },
		"bcc": ["team@example.com"],
		"from": { "name": "Release Buddy", "email": "releases@example.com" },
	},
	"confluenceSettings": {
		"enabled": true,
		"space": "REL",
		"parentId": "12345",
	},
}
```

Any notifier with `"enabled": false` (or omitted) is skipped. Slack webhook URLs
live in this per-repo file; SendGrid and Confluence credentials live in the
server's environment (see `.env.example`).

Then publish a release at `https://github.com/{owner}/{repo}/releases/new`. The
tag, title, and markdown body are used in every notification.

## Contributing

Bugs and ideas welcome — open an issue or a PR. See the
[Contributing Guide](CONTRIBUTING.md).

## License

ISC. Original work © 2019 ecobee Inc.; modernization by heymumford.
