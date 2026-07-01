# ADR 0001: Maintained fork of ecobee/release-buddy

## Status

Accepted (2026-06-30) — heymumford

## Context

`ecobee/release-buddy` is a useful Probot GitHub App (release-note fan-out to
Slack, email, Confluence) that has been effectively unmaintained since 2019: the
last human commit was 2019-08-12, its issues have sat unresolved since 2018, and
its dependency tree no longer installs/starts cleanly on Node 20+. Upstream's
released version is `1.0.0` with no git tags. It is ISC-licensed (permissive,
attribution-only, no NOTICE obligation, no trademark on the name).

We want a working, maintained version. Three questions had to be settled:
how to fork, what to call it, and how to version the first release.

## Decision

**Detached copy, not a GitHub fork.** We host an independent repository with a
squashed import of upstream at commit `89a2c41`. Upstream's full history is kept
on the `upstream` git remote for provenance.

- Rationale 1 — upstream committed a live Slack Incoming Webhook URL and personal
  data to public history in 2018; a raw GitHub fork would re-host those commits.
  The import scrubbed them to placeholders.
- Rationale 2 — this is a maintained _continuation_ with its own issues,
  releases, and CI, not a change destined back upstream. Notable continuations
  (OpenTofu, Valkey, Forgejo, LibreWolf) are detached repos for the same reason;
  GitHub forks optimize for contribute-back-to-upstream.

**Keep the name `release-buddy`.** Discoverability for users seeking a working
release-buddy outweighs the base-name collision. Non-official status is made
explicit in the README, `FORK.md`, and this ADR, not by renaming.

**Version `2.1.0-next.1` for the first release.** Upstream stopped at `1.0.0`, so
there is no upstream `2.x` to continue. This fork already bumped to `2.0.0` for
the ESM/Probot 14 break; `2.1.0-next.1` is the first stewardship release, with
the `-next` suffix marking it a pre-release of the `2.1` line.

**Not published to npm.** This is a deployed GitHub App, not a library. The
package is marked `"private": true` to prevent accidental `npm publish` and to
sidestep the bare-name collision with any `release-buddy` package on the public
registry. If publishing is ever wanted, use a scope (`@heymumford/release-buddy`).

## Consequences

- Provenance is documented (this ADR, `FORK.md`, the `upstream` remote, the
  import commit body) rather than shown by a GitHub "forked from" badge.
- ISC and the ecobee copyright are preserved verbatim in `LICENSE`.
- Users can migrate with no config change — `releaseBuddy.config.json` is
  compatible.

## Risks

- **Diverges from the general "prefer a real GitHub fork" guidance.** Mitigation:
  provenance is preserved explicitly and the leaked-secret history is a concrete
  reason not to re-host upstream commits.
- **Same name as upstream could imply endorsement.** Mitigation: an explicit
  "not affiliated with or endorsed by ecobee Inc." notice in the README and
  `FORK.md`.

## Composes / Related

- Governance and maintenance policy: `GOVERNANCE.md`, `FORK.md`.
- Engineering standards adopted for this fork: ADR 0002.
