# Release Buddy

Release Buddy is a [GitHub App](https://probot.github.io) that fans out release
notes when you publish a GitHub release. When a release is published, it can:

- post to one or more **Slack** channels,
- send an **email** via SendGrid, and
- create a **Confluence** page.

Each notifier is opt-in per repository through a `releaseBuddy.config.json` file.

> **Maintained fork.** This is a maintained continuation of
> [`ecobee/release-buddy`](https://github.com/ecobee/release-buddy) (ISC),
> created to keep the project secure, buildable, and useful after upstream
> maintenance stopped in 2019. **It is not affiliated with or endorsed by ecobee
> Inc.** See [`FORK.md`](FORK.md) for provenance and [`GOVERNANCE.md`](GOVERNANCE.md)
> for how it is maintained.

## Why this fork exists

- Restore working builds on modern Node (upstream does not install/start cleanly
  on Node 20+).
- Fix long-standing notification bugs and a leaked credential in upstream history.
- Add small, backward-compatible improvements with clear release notes.

Compared to upstream it targets Probot 14, Node 20+, and ESM; drops the abandoned
Google Cloud Functions deployment path; replaces the callback-based Confluence
client with the Confluence REST API; and fixes several notification bugs. See
[`CHANGELOG.md`](CHANGELOG.md) for the full diff and [`SECURITY.md`](SECURITY.md)
for how to report vulnerabilities.

### Migrating from upstream

- **Config:** none needed — an existing `releaseBuddy.config.json` keeps working.
- **Deployment:** the Google Cloud Functions path is gone. Redeploy as a standard
  Probot Node server or container (see [Deployment](#deployment)). Point the
  GitHub App webhook at the new endpoint.
- **Runtime:** requires Node ≥ 20.

## How it works

A GitHub release (via Probot) or a GitLab release webhook is normalized to a
neutral release object and handed to a shared notifier core:

| File                      | Responsibility                                                 |
| ------------------------- | -------------------------------------------------------------- |
| `index.js`                | GitHub adapter (Probot `release.published`) + mounts `/gitlab` |
| `src/getConfig.js`        | Read `releaseBuddy.config.json` from a GitHub repo             |
| `src/gitlab/webhook.js`   | GitLab adapter: verify token, normalize, dispatch              |
| `src/gitlab/getConfig.js` | Read `releaseBuddy.config.json` from a GitLab project (API)    |
| `src/dispatch.js`         | Shared: run the enabled notifiers, isolate failures            |
| `src/slackNotify.js`      | Post to every configured Slack channel                         |
| `src/sendMail.js`         | Send the release notes via SendGrid                            |
| `src/writeConfluence.js`  | Create a Confluence page for the release                       |

Draft and pre-release publishes are ignored so they don't page the whole team.

## Creating releases (CLI)

Beyond _reacting_ to releases, Release Buddy can _create_ them. The `release`
command reads the commits since the last tag on a GitHub repo, derives the next
version and changelog from the conventional-commit history (ADR 0004), and
creates the GitHub release.

**Dry run is the default — nothing is created unless you pass `--live`.**

```sh
# Dry run: print the plan (next version + changelog); create nothing.
npm run release -- --repo <owner>/<name>

# Create the release for real. Requires a token with `contents: write`.
GITHUB_TOKEN=… npm run release -- --repo <owner>/<name> --live
```

| Flag                    | Effect                                                                |
| ----------------------- | --------------------------------------------------------------------- |
| `--repo <owner>/<name>` | Target repository (required)                                          |
| `--owner <name>`        | Owner when `--repo` is a bare name; if both are given they must agree |
| `--live`                | Create the release. Without it, dry run (default)                     |
| `--no-dry-run`          | Alias for `--live`                                                    |
| `--current-version <x>` | Override the base version (default: last tag, or `0.0.0` if none)     |

A dry run prints the next version **and the full changelog it would publish**, so
you can preview the notes before `--live`.

Safety: `--live` without `GITHUB_TOKEN` is refused; a dry run never calls the
release-create API. A malformed target (bad `--repo`, or `--owner` disagreeing
with `--repo`) is refused rather than retargeted. When there are no releasable
commits, the command reports so and exits `0` without creating anything. The next
version is tagged `v<version>`.

## GitLab (in addition to GitHub)

The same service handles GitLab releases via a webhook — no GitHub App equivalent
exists on GitLab, so onboarding is per-project (or per-group):

1. Set `GITLAB_WEBHOOK_SECRET` (a secret you choose) and `GITLAB_TOKEN` (a token
   with `read_repository`) in the app's environment. For self-managed GitLab, set
   `GITLAB_URL`.
2. In the GitLab **project or group → Settings → Webhooks**, add a webhook:
   - **URL:** `https://<your-host>/gitlab`
   - **Secret token:** the same value as `GITLAB_WEBHOOK_SECRET`
   - **Trigger:** _Releases events_
3. Add `releaseBuddy.config.json` to the project root (same schema as GitHub).
4. Create a release — Release Buddy fetches the config via the GitLab API and
   notifies through the shared core.

Requests with a missing/mismatched token get `401`; non-release or non-`create`
events are acknowledged and ignored.

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
npm run lint           # prettier --check + markdownlint
npm run format         # autofix formatting
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
		// Recommended: name an env var read at runtime — keeps the secret OUT of
		// the repo. Set that var in the app's environment.
		"slackWebhookUrlEnv": "SLACK_WEBHOOK_URL",
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

Any notifier with `"enabled": false` (or omitted) is skipped.

**Do not commit your Slack webhook URL.** Prefer `slackWebhookUrlEnv` (the name of
an environment variable the app reads at runtime) over a literal `slackWebhookUrl`
in the committed config — a committed webhook is a leaked credential, and on a
repo with push protection it will be rejected outright. SendGrid and Confluence
credentials already live only in the server's environment (see `.env.example`).

Then publish a release at `https://github.com/{owner}/{repo}/releases/new`. The
tag, title, and markdown body are used in every notification.

## Roadmap

Where this fork is headed — and what it deliberately won't do — is in
[`docs/ROADMAP.md`](docs/ROADMAP.md).

## Contributing

Bugs and ideas welcome — open an issue or a PR. See the
[Contributing Guide](CONTRIBUTING.md).

## License

ISC. Original work © 2019 ecobee Inc.; modernization by heymumford.
