# Fork Notice

`heymumford/release-buddy` is a **maintained fork** of
[`ecobee/release-buddy`](https://github.com/ecobee/release-buddy).

It is **not affiliated with, nor endorsed by, ecobee Inc.** The name is retained
for continuity with the original project; officialness is not implied.

## Why this fork exists

The upstream project appears inactive (as of 2026-06-30):

| Signal                     | Observed                                                                     |
| -------------------------- | ---------------------------------------------------------------------------- |
| Last human commit upstream | 2019-08-12                                                                   |
| Most recent push upstream  | 2026-06-24 (automated dependency bot only)                                   |
| Released version           | `1.0.0`, no git tags                                                         |
| Open issues                | several open since 2018, none resolved ([tracker][issues])                   |
| Runs on current Node       | no — the upstream dependency tree does not install/start cleanly on Node 20+ |

[issues]: https://github.com/ecobee/release-buddy/issues

This fork keeps the project usable: it runs on current Node, has a green test
suite, and fixes long-standing notification bugs.

## Provenance

- Imported from upstream commit `89a2c41` (the tip of `ecobee/release-buddy`
  `master` at import time).
- The full upstream commit history is preserved on the `upstream` git remote
  (`git remote add upstream https://github.com/ecobee/release-buddy.git`).
- The import was squashed into a single commit for a clean base. One reason it
  was **not** re-published as a raw GitHub fork: upstream committed a live Slack
  Incoming Webhook URL and personal contact data to public history in 2018;
  those were scrubbed to placeholders during import rather than re-hosted.
- The original ISC license and ecobee copyright are preserved verbatim in
  [`LICENSE`](LICENSE).

## Original authors and credit

Release Buddy was created by **Cam Sloan** (sole author in the upstream
`package.json`), with contributions from **Diego La Manno**, **nonAlgebraic**,
**Sine**, and **Tim Li** (from the preserved upstream history). Copyright for the
original work is held by **ecobee Inc.** under the ISC license. The full
contributor record is preserved on the `upstream` git remote; run
`git shortlog -sn upstream/master` to see it.

## Goals

- Keep the original project usable on current runtimes.
- Fix security, compatibility, and correctness issues.
- Add carefully scoped, backward-compatible features.
- Preserve backward compatibility where practical, with migration notes when not.

## Non-goals

- Claim official ownership or endorsement of the original project.
- Remove original author credit.
- Break existing users without a migration path.

## Relationship to upstream

If the original maintainers return and want to coordinate, we are glad to
upstream fixes or hand work back where appropriate. See
[`GOVERNANCE.md`](GOVERNANCE.md) for how decisions are made here.

## Staying current with upstream

Upstream is effectively dormant, so there is no routine sync. If upstream
revives, changes will be evaluated and cherry-picked from the `upstream` remote
on their merits rather than merged wholesale.
