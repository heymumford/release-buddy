# Release Buddy task runner. `just --list` for the catalog.
# npm scripts remain the canonical commands; these recipes just compose them.

# Show the recipe catalog
default:
	@just --list

# ---- Install ----

# One-time / idempotent dependency install
install:
	npm ci

# ---- Build & test ----

# Run the test suite
test:
	npm test

# Run tests with coverage
test-coverage:
	npm run test:coverage

# ---- Lint & format ----

# Autofix formatting
format:
	npm run format

# Check formatting (no writes)
format-check:
	npm run lint

# Lint markdown docs
lint-markdown:
	npx --yes markdownlint-cli2 "**/*.md" "#node_modules"

# ---- Security ----

# Audit dependencies for known vulnerabilities
audit:
	npm audit --omit=dev

# Secret-scan this fork's own history (excludes upstream remote-tracking refs,
# which still contain the 2018 leak that was scrubbed from our import). Fails if
# gitleaks is not installed.
secret-scan:
	@command -v gitleaks >/dev/null 2>&1 || { echo "gitleaks not installed — see https://github.com/gitleaks/gitleaks"; exit 1; }
	gitleaks detect --source . --redact --log-opts="HEAD"

# ---- Composite gates (each is a superset of the one below) ----

# Everyday gate: formatting + tests
check: format-check test

# Pre-push gate: check + secret scan + dependency audit
prepush: check secret-scan audit
