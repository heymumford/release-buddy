# ADR 0004: Release-creation toolkit (focused release-please subset)

## Status

Accepted (2026-06-30) — heymumford

> **Amends ADR 0001's product scope.** Release Buddy grows from a release
> _notifier_ into a unified _create + notify_ release toolkit for GitHub and
> GitLab. The notifier becomes the final "announce" step of the release flow.

## Context

The notifier answered "a release happened — tell people." Users also want the
step before it: turn merged work into a release (version bump, changelog, tag,
GitHub/GitLab Release) — the job of tools like release-please and semantic-release.
Nothing lightweight does release **creation + multi-channel notification** across
**both GitHub and GitLab**; that gap is the product opportunity.

## Decision

Absorb the **high-value core** of release-please, built our way (small modules,
TDD, platform-agnostic core + thin adapters — same shape as the notifier side):

1. **Conventional-commits parsing** → semver bump level (`src/release/commits.js`).
2. **Next-version computation** (`src/release/version.js`).
3. **CHANGELOG generation** (Keep a Changelog) from commits.
4. **Release creation** via adapters: GitHub (octokit) and GitLab (API) — tag +
   Release, reusing the existing source-adapter split (ADR 0003).
5. **Orchestration**: create-then-announce, wired to the existing notifier core.

**Explicitly out of scope** (the release-please long tail — revisit on demand):
monorepo/multi-package releases, the plugin system, N-language manifest updaters
beyond the common ones, and separate release-PR bot automation. We favor one
clean create→notify path over feature parity.

## Consequences

- The pure logic (parse/bump/version/changelog) is dependency-free and
  exhaustively unit-testable — the TDD core of the toolkit.
- Release creation composes with notification: one flow can cut a release and
  announce it across GitHub/GitLab + Slack/email/Confluence.
- `docs/ROADMAP.md` is superseded on the "won't build release management" line;
  the trust/observability notifier items remain valid and still queued.

## Risks

- **Scope creep back toward full parity.** Mitigation: the out-of-scope list
  above is the contract; new long-tail items need their own ADR.
- **Bump/versioning edge cases** (pre-release lines, 0.x semantics). Mitigation:
  start with the common path under test; extend as real cases appear.

## Composes / Related

- Source adapters: ADR 0003. Fork/provenance: ADR 0001. Standards: ADR 0002.
