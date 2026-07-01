# Release Buddy — Product Roadmap (maintained fork)

## Status: this is not greenfield

The fork does two jobs today. It **announces** a release — on `release.published`
(drafts and pre-releases skipped so no one gets paged for a WIP tag) or a GitLab
release webhook, it fans the notes out to **Slack, email, and Confluence**, each
an opt-in notifier reading a tolerant per-repo `releaseBuddy.config.json`. And it
**creates** a release (ADR 0004) — a `release` command turns commit history into a
next version, changelog, and GitHub release, dry-run by default. It runs as a
Probot 14 ESM app on Node 20/22, ships a container, and carries a real quality
spine: a full test suite, structured logging + Prometheus metrics, retry-with-
backoff, config-schema validation, per-notifier error isolation, a CI matrix +
`npm audit` + gitleaks + CodeQL, Dependabot, and a full governance set (ADRs, CoC,
CONTRIBUTING, SECURITY, semver CHANGELOG). The trust-floor reliability guarantees
that were the original gap have now landed; the frontier is richer content and the
create/announce seam.

## Differentiation thesis

No open-source tool fans a single release event out to **Slack _and_ email _and_
Confluence**. That trio — not any one channel — is the defensible scope.

| Alternative                    | Why we win                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Slack-only GitHub Actions      | We're release-_aware_ and multi-channel, not a manual per-workflow Slack step                                                 |
| rtCamp Slack Notify            | Generic workflow step, not a release-event app; we understand tags/notes                                                      |
| Release Drafter                | It _drafts_ notes and doesn't notify — **complementary**; we consume what it produces                                         |
| Atlassian Release Management   | Paid, heavyweight, Jira-locked; we're lightweight, self-hostable, no lock-in                                                  |
| GitHub's first-party Slack app | Can't write Confluence pages or send email, and it's proprietary; we win on cross-channel fan-out + self-hosting/data control |

**Position:** the notification layer _downstream_ of Release Drafter and CI — the
piece incumbents structurally can't cover. Compose, don't compete.

---

## Roadmap by horizon

Business outcome first. Effort S/M/L. No dates, no estimates.

### Already shipped — do not mistake for future work

| Capability                                                                             | Outcome delivered                                          |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Slack + email + Confluence notifiers                                                   | One release event reaches three destinations               |
| `release.published` trigger + draft/pre-release guard                                  | No false or premature pages                                |
| GitLab release webhook (alongside the GitHub app)                                      | One deploy announces releases from both platforms          |
| Per-repo `releaseBuddy.config.json` (tolerant read)                                    | Teams self-serve config without a redeploy                 |
| Structured logging + per-notifier try/catch                                            | One failing channel never sinks the others                 |
| Throw-on-non-2xx in every notifier                                                     | A rejected send is a loud failure, not a silent success    |
| Retry with bounded backoff (transient-only)                                            | A 429/5xx/network blip no longer silently loses a notice   |
| JSON Schema validation of config                                                       | A config typo fails loudly instead of dropping silently    |
| Generic HTTP webhook notifier                                                          | Discord/Opsgenie/raw-Teams reachable with no bespoke code  |
| Log lines enriched with repo/tag                                                       | A dropped or double-send is greppable in seconds           |
| Prometheus metrics + `GET /metrics`                                                    | Delivery reliability is measurable, not just believed      |
| **Release-creation toolkit** (commits → version → changelog; GitHub + GitLab adapters) | Commit history becomes a versioned release plan (ADR 0004) |
| **`release` CLI** (dry-run default, fail-closed on a bad target)                       | Cut a GitHub release from the command line, safely         |
| Container + Node 20/22 CI + audit + gitleaks + CodeQL                                  | Deployable and supply-chain-scanned out of the box         |
| Governance (ADRs, CoC, CONTRIBUTING, SECURITY, semver)                                 | Contributions have a clear, credible on-ramp               |

### Now — close the create/announce seam

The original trust-floor "Now" (retry, config validation, generic webhook, log
context) has shipped — see _Already shipped_. The current small, high-impact work
connects the two jobs the tool now has.

| #   | Item                                                | Business outcome                                                             | Effort | Rationale                                                                                                     |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| 1   | **Announce from the `release` CLI's live create**   | One command both cuts a release and notifies the team — no second trigger    | M      | The `release` CLI creates but doesn't yet notify; wiring `dispatch` in closes ADR 0004's create+announce loop |
| 2   | **Request timeout / abort on the GitHub API calls** | The CLI (and any CI job running it) fails fast instead of hanging on a stall | S      | Thread an `AbortSignal` into the commit read + release create; matches fail-closed                            |
| 3   | **`--validate-config` CLI**                         | Maintainers catch a broken config before commit, not after a missed release  | S      | Reuses the shipped schema; a second, safe entry point on the same core                                        |

### Next — expands value once the trust floor is set

| Item                                                     | Business outcome                                                | Effort | Rationale                                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| Config-error alerting (commit status / fallback channel) | A misconfigured repo's silent releases become human-visible     | M      | Closes the "warn-and-return" blind spot                                              |
| Rich configurable Markdown templates                     | Teams shape their own release message across all channels       | M      | High value but touches all three renderers with escaping/injection risk — needs care |
| Microsoft Teams support                                  | First-class enterprise fan-out beyond raw webhook               | M      | Layer Adaptive/MessageCard formatting _on top of_ the generic-webhook notifier       |
| Release-notes enrichment (change count, notable commits) | Richer notifications straight from read-only GitHub compare API | M      | Lifts content value without expanding blast radius                                   |
| GitHub Issues linking (read-only #ref resolution)        | Release notes carry live links to referenced issues             | M      | Stays in the notification lane — keep read-only, never write back                    |

### Later — defer until demand and the trust floor justify them

| Item                                                        | Effort | Why deferred                                                                                                            |
| ----------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| Org-level config defaults                                   | M      | Introduces merge/precedence semantics — a new failure surface                                                           |
| Jira release-version / ticket updates                       | L      | Moves from read-only fan-out to _mutating_ external state; needs idempotency first                                      |
| Latency SLO / error-budget program                          | S      | For a webhook, drops matter more than sub-second latency; keep latency as a metric label                                |
| KPI analytics beyond reliability (DORA/adoption)            | L      | Cross-org aggregation + dashboard — out of a focused notifier's lane                                                    |
| Manual `release-buddy send` CLI                             | M      | Useful for backfilling a missed release, but risks a second drift-prone code path                                       |
| Automatic release trigger (Probot `push` → release-PR flow) | L      | The `release` CLI covers on-demand creation; auto-firing on push is a larger design fork — write an ADR before building |
| Container hardening (non-root, HEALTHCHECK)                 | S      | Dockerfile already ships; low-urgency polish                                                                            |
| Community-building (Discussions, good-first-issue)          | S      | Cheap, but growth follows a product that visibly works in the wild                                                      |
| Mentions (@user/@group)                                     | S      | A sub-capability of templating; fold in after templates land                                                            |

### Won't-do — scope creep that fights the mandate

| Item                            | Why not                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Web UI dashboard                | Turns a stateless webhook into a stateful hosted service; logs + Slack history cover visibility          |
| RBAC / multi-tenant platform    | The app already inherits GitHub's org/app permissions; tenancy adds attack surface, zero reliability     |
| Monetization (open-core / SaaS) | Premature with no adoption base; reliability is what earns trust                                         |
| Opt-in anonymous telemetry      | A phone-home backend adds data-exfil risk; operators get what they need from their own Prometheus scrape |
| SMS notifications               | Poor medium for long-form notes; paging is covered by Opsgenie via the generic webhook                   |
| Internationalization framework  | The release body already carries the author's language; templates subsume wrapper strings                |
| Multi-repo / HA replicas        | Fan-out is inherent; the real gap is delivery idempotency/dedup, not redundant instances                 |

---

## How we'll measure it

Only KPIs that are cheap and honest for a small OSS tool. No vanity metrics.

| KPI                                    | Question it answers                            | Available now?                                                                            |
| -------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Delivery success rate (sent vs failed) | Does it drop notifications?                    | **Available now** — `sent`/`failed` counters at `/metrics`                                |
| Retry/recovery count                   | How often does backoff save a delivery?        | Retry shipped; recoveries visible in logs (a dedicated counter would quantify)            |
| Config-error rate                      | How many repos are silently misconfigured?     | Validation shipped (loud failure); an aggregate rate needs the config-error alerting item |
| Notification content completeness      | Do all three channels render the same release? | Observable today via structured logs                                                      |
| CI green / test pass                   | Is the codebase healthy?                       | Available now                                                                             |

**Deliberately not tracked:** adoption/install counts, DORA metrics, engagement
analytics — they require cross-org aggregation the tool doesn't have and
shouldn't grow to have.

## Risks & sustainability

The sharpest risk is **redundancy against GitHub's free first-party Slack app** —
the defense is the exact seam GitHub can't cover: Confluence pages, email, and
self-hosted data control from one release event. Licensing and supply chain are
handled (permissive fork; gitleaks + CodeQL + Dependabot + `npm audit`). The real
sustainability threat is maintenance drift on a small fork: every new notifier is
another integration to keep green, which is why the generic-webhook notifier (one
code path, many destinations) is favored over N bespoke integrations. The
**announce** path stays strictly read-only — it never writes back to Jira or issue
comments, because doing so multiplies the failure and trust surface for marginal
gain. The one place the tool _does_ write external state is the **create** path,
and it is deliberately narrow: an explicit operator command, dry-run by default,
that fails closed on an ambiguous target — never an autonomous webhook-driven
mutation.
