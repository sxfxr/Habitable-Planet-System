# Verification status — 2026-10-08

Deployment is pending; no live website has been verified yet.

## Local verification

- Original supplied suite: 12/12 passed.
- Expanded suite: 14/14 passed, including two embedded PostgreSQL (PGlite) integration tests.
- Integration coverage: repeated schema application, viewer and invited researcher registration,
  duplicate usernames, invalid passwords, login, password hashing, role restrictions,
  star creation/editing, planet creation/editing, duplicate planets, initial observations,
  habitability calculation, daily observation upserts, star-change recalculation,
  expired tokens, malformed JSON, and oversized bcrypt inputs.
- Dependency audit after compatible fixes: zero reported vulnerabilities.
- PGlite tests execute PostgreSQL SQL/PLpgSQL but do not verify Neon network/TLS connectivity.

- All three frontend inline scripts pass Node syntax checks.
- Local browser testing was blocked: the Chromium download returned an invalid archive.

## Required live checks

Neon schema and TLS connection; Render health check; desktop/mobile planet and moon
navigation; viewer registration/login/logout; invited researcher registration/login;
researcher create/edit/calculate workflows; browser console and network failures.

## Fixes

Render serves the entire repository rather than an inaccessible sibling frontend.
Startup applies an idempotent transactional schema migration. Observation triggers
keep newly created planets and edited stars consistent. Database-derived labels are
escaped, expired sessions are handled, auth input is validated, dependency advisories
are resolved, and hosted PostgreSQL uses certificate verification.

## Account deployment status

GitHub write access verified. Neon free project connected. Production deployment and live verification are in progress.
