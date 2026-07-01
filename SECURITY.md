# Security Policy

Release Buddy is a GitHub App that handles delivery credentials (Slack webhook
URLs, a SendGrid API key, and Confluence API tokens). We take reports seriously.

## Supported versions

| Version                         | Supported                        |
| ------------------------------- | -------------------------------- |
| `2.1.0-next.x` (and later)      | ✅                               |
| `1.x` (upstream ecobee release) | ❌ — unmaintained, do not deploy |

## Reporting a vulnerability

**Do not open a public issue for security reports.**

Preferred: use GitHub's
[private vulnerability reporting](https://github.com/heymumford/release-buddy/security/advisories/new)
("Report a vulnerability" under the Security tab).

Alternatively, email <eric@mumfordengineering.com> with the subject prefix
`[release-buddy security]`. Include reproduction steps and impact. Expect an
acknowledgement within a few days; please allow time to fix before any public
disclosure.

## Defense-in-depth already in place

- **Secret scanning + push protection** on the repository, so credentials
  cannot be pushed. (The 2018 upstream Slack webhook leak was scrubbed during
  import — see [`FORK.md`](FORK.md).)
- **Gitleaks** configuration for local/CI secret scanning (`.gitleaks.toml`).
- **GitHub CodeQL** code scanning (`.github/workflows/codeql.yml`), the
  security-and-quality query suite, on every PR and weekly.
- **Dependabot** security and version updates (`.github/dependabot.yml`).
- **CI** runs `npm audit` and a secret scan on every pull request.

## Credential handling

- SendGrid and Confluence credentials live only in the deployment environment
  (see `.env.example`); they are never committed.
- Slack webhook URLs should be supplied via `slackWebhookUrlEnv` (an env var name
  the app reads at runtime), not committed. A literal `slackWebhookUrl` in a
  committed `releaseBuddy.config.json` is a leaked credential and is rejected by
  push protection.
- Draft and pre-release publishes are ignored, reducing accidental notification
  fan-out.
