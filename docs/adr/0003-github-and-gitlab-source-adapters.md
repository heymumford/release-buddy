# ADR 0003: GitHub and GitLab source adapters

## Status

Accepted (2026-06-30) — heymumford

## Context

Release Buddy began as a GitHub-only Probot app. Probot _is_ a GitHub-Apps
framework — it cannot receive GitLab events. Supporting GitLab is therefore not a
docs change; it needs a second event-source path with a different onboarding
model (per-project/group webhook, not an app install) and a different way to read
the config file (the GitLab webhook payload carries no repo files).

The notifiers (`slackNotify`, `sendMail`, `writeConfluence`) were already
platform-agnostic — they take a neutral `{ releaseDetails, repositoryName,
teamName }`. Only event handling and config reading were GitHub-specific.

## Decision

**One service, source-adapter architecture.** Extract the enabled-notifier logic
into a shared `src/dispatch.js`. Two thin adapters normalize their platform event
to `dispatch`'s inputs:

| Adapter                     | Trigger                                                  | Config read                                       | Onboarding                  |
| --------------------------- | -------------------------------------------------------- | ------------------------------------------------- | --------------------------- |
| GitHub (`index.js`, Probot) | `release.published` (skips draft/pre-release)            | App API `getContent`                              | Install the GitHub App      |
| GitLab (`src/gitlab/`)      | `POST /gitlab`, `object_kind: release`, `action: create` | GitLab REST `files/:path/raw` with `GITLAB_TOKEN` | Add a project/group webhook |

Both run in **one process/deploy**. The GitLab route is mounted via Probot 14's
`Server.addHandler` (a raw Node HTTP handler), which `probot run` supports and
which keeps the smee dev proxy — so no `express` dependency and no second server.
The GitLab webhook is authenticated by a constant-time compare of the
`X-Gitlab-Token` header against `GITLAB_WEBHOOK_SECRET`.

## Consequences

- New notifiers or event sources compose cleanly: a source produces
  `releaseDetails`; the notifier core is untouched.
- Deployment now exposes two endpoints on one host: `/api/github/webhooks`
  (Probot) and `/gitlab` (our handler).
- GitLab needs a read-scoped API token; GitHub uses the App's own auth. Both
  secrets live only in the environment.

## Risks

- **`Server.addHandler` is a Probot-internal HTTP extension** (the older
  `getRouter` was removed in v14). Mitigation: it is exercised by unit tests and
  is the documented v14 mechanism; the handler is a pure function of `(req, res)`
  and is independently testable.
- **GitLab release payload shape varies** (fields top-level vs. nested).
  Mitigation: a tolerant reader (`object_attributes ?? body`, `tag ?? tag_name`).
- **Config read requires a GitLab token** with repository read. Mitigation:
  documented; missing token degrades to a logged skip, never a crash.

## Composes / Related

- Shared notifier core: `src/dispatch.js`. Webhook secret handling: `SECURITY.md`.
- Prior decisions: ADR 0001 (fork), ADR 0002 (standards).
