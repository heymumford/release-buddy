# ADR 0002: Engineering standards and quality gates

## Status

Accepted (2026-06-30) — heymumford

## Context

As a maintained fork intended to be safer and easier to contribute to than the
abandoned upstream, this repo adopts a layered, fail-closed quality posture. The
standards are a small subset of a larger private engineering baseline, keeping
only what applies to a small public Node.js project and dropping everything
platform- or organisation-specific.

## Decision

**Repo hygiene.** Ship `.editorconfig`, `.gitattributes` (LF normalization),
`.gitignore`, and Prettier (`.prettierrc`) as the single formatter. Markdown is
linted with `markdownlint-cli2` (`.markdownlint-cli2.yaml`).

**Layered gates (fast → authoritative).** A `check` → `prepush` tiering, each
tier a superset of the one below, via a `justfile` and npm scripts:

| Tier      | Runs                                                             | When                                   |
| --------- | ---------------------------------------------------------------- | -------------------------------------- |
| `check`   | format check + tests                                             | every change, locally                  |
| `prepush` | `check` + full-history secret scan + `npm audit`                 | before push                            |
| CI        | lint + tests (Node 20 & 22) + secret scan + `npm audit` + CodeQL | every PR (authoritative, unbypassable) |

**Security scanning stack.**

- Secrets: repository secret-scanning + push protection, plus **Gitleaks**
  (`.gitleaks.toml`) locally and in CI, full-history at pre-push.
- Dependencies: **Dependabot** (security + version updates) and `npm audit` in CI.
- SAST: **GitHub CodeQL** code scanning.

**Fail-closed posture.** A missing secret-scanner binary fails rather than
silently skips. A structural self-check test asserts the stewardship/security
wiring is present (see below), so removing a control breaks CI.

**Measure yourself first.** A test (`test/stewardship.test.js`) asserts on-disk
presence of `LICENSE` (with the ecobee copyright), `FORK.md`, `SECURITY.md`,
`.gitleaks.toml`, and Dependabot config — the "structural fitness" idea applied
to this repo's own governance.

## Consequences

- Contributors get one formatter, one task entry point (`just --list`), and a
  clear local gate that matches CI.
- New security controls can land advisory and be promoted to blocking after a
  clean interval.

## Risks

- **SAST choice: CodeQL.** Chosen on its own merits — native to GitHub, free for
  public repos, runs out-of-box for JavaScript, and is recognised by OpenSSF
  Scorecard's SAST check, so there is no config to port or maintain. A
  rule-based scanner (e.g. Semgrep) can be added later if a specific rule is
  needed.
- **Divergence: no `just` requirement for contributors.** `just` is provided as a
  convenience wrapper; the canonical commands remain `npm` scripts so a
  contributor without `just` is never blocked.

## Composes / Related

- Fork decision and provenance: ADR 0001.
- Security disclosure: `SECURITY.md`.
