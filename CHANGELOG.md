# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Upstream `ecobee/release-buddy` stopped at `1.0.0` (2019) and published no tags.
The `2.x` line here is this fork's own — the major bump signals the ESM/Probot 14
break, not a continuation of any upstream `2.x` (there was none).

## [Unreleased]

### Added

- Foundation for release **creation** (ADR 0004): conventional-commits parsing
  with semver bump detection, next-version computation, and Keep a Changelog
  section generation. Pure, fully unit-tested building blocks; not yet wired into
  a command.

## [2.2.0-next.1] - 2026-06-30

### Added

- **GitLab support.** The same service now also handles GitLab release webhooks
  (`POST /gitlab`), verified by a secret token, reading `releaseBuddy.config.json`
  via the GitLab API and notifying through the shared notifier core. Onboard a
  project or group via a webhook (see README). GitHub and GitLab share one deploy.

### Changed

- Refactored the enabled-notifier logic into a shared, platform-agnostic
  `dispatch` core consumed by both the GitHub (Probot) and GitLab adapters. No
  behavior change on the GitHub path.

## [2.1.0-next.2] - 2026-06-30

### Added

- `slackWebhookUrlEnv` config field: the Slack webhook is read from a named
  environment variable at runtime, so the secret is never committed. A literal
  `slackWebhookUrl` still works for backward compatibility. Committing a webhook
  is a leaked credential (and is rejected by push protection).

## [2.1.0-next.1] - 2026-06-30

First release of the maintained fork. The `2.0.0` modernization (ESM, Probot 14)
and this `2.1.0-next.1` stewardship release are both this fork's own versions;
the `-next` suffix marks it as a pre-release of the `2.1` line.

### Added

- Draft/pre-release guard: published pre-releases and drafts no longer trigger
  notifications (upstream issue #5).
- `Dockerfile` + standard Probot server for deployment (replacing the removed
  Google Cloud Functions path).
- GitHub Actions CI (Node 20 + 22), Dependabot, CodeQL, and Prettier formatting.
- A full test suite with Vitest.
- Fork-stewardship docs: `FORK.md`, `GOVERNANCE.md`, `SECURITY.md`, this
  changelog, ADRs under `docs/adr/`, issue/PR templates, and a `justfile`.

### Changed

- Migrated to ESM; upgraded Probot 7 → 14; require Node ≥ 20.
- Replaced `node-fetch` with the global `fetch`, `markdown@0.5` with `marked`,
  Jest with Vitest, and `standard`/eslint-airbnb with Prettier.
- Replaced the callback-based `confluence-api` (which pulled in the deprecated
  `request` package) with a direct Confluence REST API client over `fetch`.

### Fixed

- Slack notifier used a fire-and-forget `forEach` that returned before any post
  resolved and swallowed per-channel errors; now awaits all posts and throws on
  a non-2xx response.
- A network-shaped error (no `.response`) threw a second `TypeError` inside the
  email/Confluence catch blocks.
- The Confluence callback `throw` escaped the caller's try/catch.
- Confluence page-title date padded only the month (`2026-06-5`); now zero-pads
  the day, in UTC.
- Slack notifier crashed when `channels` was a single string instead of an array.
- Email validation accepted a `from` object with no `email` address.

### Security

- Scrubbed a live Slack Incoming Webhook URL and personal contact data that
  upstream committed to public history in 2018.

[Unreleased]: https://github.com/heymumford/release-buddy/compare/v2.2.0-next.1...HEAD
[2.2.0-next.1]: https://github.com/heymumford/release-buddy/compare/v2.1.0-next.2...v2.2.0-next.1
[2.1.0-next.2]: https://github.com/heymumford/release-buddy/compare/v2.1.0-next.1...v2.1.0-next.2
[2.1.0-next.1]: https://github.com/heymumford/release-buddy/releases/tag/v2.1.0-next.1
