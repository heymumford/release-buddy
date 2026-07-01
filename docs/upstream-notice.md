# Upstream courtesy notice (draft — not yet sent)

Intended as an issue on `ecobee/release-buddy` (or an email to the maintainers).
Drafted for review; **do not post without the maintainer's go-ahead.**

---

**Title:** Heads-up: a maintained fork of release-buddy

**Body:**

Hi — thanks for release-buddy; it solved a real problem cleanly.

The project looks inactive (last release in 2019, and its dependencies no longer
install/start on current Node), so I've published a maintained fork here:
<https://github.com/heymumford/release-buddy>

It modernizes the app (ESM, Probot 14, Node 20+), fixes several notification
bugs, and adds tests and CI. It keeps your ISC license and credits the original
authors. It's explicitly **not** presented as official or endorsed by ecobee.

One thing worth flagging directly: the original repo has a live Slack Incoming
Webhook URL and some personal contact data committed to public history (in
`releaseBuddy.config.json` and the test fixtures, ~2018). You may want to rotate
that webhook and consider scrubbing it from history. My fork replaced it with a
placeholder.

If you'd prefer a different name for the fork, or if you become active again and
want to coordinate — I'm happy to send fixes upstream or hand work back. Just let
me know.

Thanks again for the original work.
