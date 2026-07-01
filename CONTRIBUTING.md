# Contributing

[fork]: https://github.com/heymumford/release-buddy/fork
[pr]: https://github.com/heymumford/release-buddy/compare
[style]: https://prettier.io/
[code-of-conduct]: CODE_OF_CONDUCT.md

Thanks for your interest. This project is a **maintained fork** of
`ecobee/release-buddy` — see [`FORK.md`](FORK.md) for what that means and
[`GOVERNANCE.md`](GOVERNANCE.md) for how decisions are made.

By participating you agree to the [Code of Conduct][code-of-conduct].

## Issues and PRs

Open an issue for bugs or ideas — a template will guide you. For anything large,
open an issue first so we can agree on scope before you build.

Security problems go through [`SECURITY.md`](SECURITY.md), **not** public issues.

## Submitting a pull request

1. [Fork][fork] and clone the repository.
2. Install dependencies: `npm install` (Node ≥ 20 — see `.nvmrc`).
3. Create a branch. We follow a `prefix/short-slug` convention:
   `bugfix/…`, `feature/…`, `docs/…`, `chore/…`.
4. Make your change **with tests** and keep it focused — unrelated changes
   belong in separate PRs.
5. Run the local gate before pushing:
   - `npm test` (or `just check`)
   - `npm run lint` (autofix with `npm run format`)
6. Update `CHANGELOG.md` under `## [Unreleased]` and, if you touch config,
   `.env.example` and the README.
7. Push to your fork and [open a pull request][pr]. Fill in the PR template.

CI (lint + tests on Node 20 and 22) must be green before merge.

### Guidelines that raise the odds of a merge

- Follow the [style guide][style] (Prettier). `npm run lint` checks it.
- Write and update tests; test behavior, not implementation.
- Backward compatibility is preferred. If you must break it, say so in the PR
  and add a migration note.
- Write a [good commit message](https://cbea.ms/git-commit/).

Work-in-progress PRs are welcome for early feedback.

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://docs.github.com/pull-requests)
