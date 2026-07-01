# Governance

This project is a small maintained fork. Governance is intentionally minimal and
will grow only if the contributor base does.

## Maintainer

Eric Mumford ([@heymumford](https://github.com/heymumford)) is the initial
maintainer and final decision-maker.

## Decision policy

Priorities, in order:

1. **Security fixes** — highest priority; may ship out of band.
2. **Compatibility and correctness fixes** — preferred over rewrites.
3. **New features** — accepted when they fit the fork's goals
   ([`FORK.md`](FORK.md)) and ship with tests.
4. **Breaking changes** — require a changelog entry, a migration note, and a
   major/minor version signal.

## How changes land

- All changes go through a pull request, even the maintainer's.
- CI (lint + tests on supported Node versions) must be green before merge.
- The default branch is protected; direct pushes are not accepted.
- Squash-merge is the default so `main` history stays one-commit-per-change.

## Maintainer growth

Regular, high-quality contributors may be invited as reviewers and then
maintainers. There is no fixed threshold; sustained trust is the signal.

## Scope

In scope: release-notification delivery (Slack, email, Confluence) driven by
GitHub release events. Out of scope: general-purpose ChatOps, unrelated GitHub
automations, or anything that pulls the app away from its single job.
