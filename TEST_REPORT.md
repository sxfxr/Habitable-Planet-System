# Deployment verification — 2026-10-09

Website: https://celestial-voyager-safar.onrender.com/
Repository: https://github.com/sxfxr/Habitable-Planet-System
Hosting: Render Free, Singapore. Database: Neon Free, PostgreSQL 18, Singapore.

## Passed

- Existing automated suite and embedded PostgreSQL integration coverage: 14/14.
- Render production build ran all 14 tests successfully.
- Dependency audit: zero reported vulnerabilities at preparation time.
- Live `/api/health`: HTTP 200, database connected.
- Live viewer registration and login; wrong passwords rejected.
- Live viewer writes rejected with 403; invalid researcher invitations rejected.
- Live researcher login, star creation and editing, planet creation and editing.
- Live initial observation trigger, calculation endpoint, daily observation upsert,
  and automatic recalculation after editing a star.
- Live public star details and observation retrieval.
- Authentication entry page rendered; viewer entry navigated to the explorer.
- Original frontend inline scripts passed syntax checks.

The synthetic account was promoted in the database to test researcher endpoints,
then returned to viewer. Successful invitation-based researcher signup was tested
locally but was not repeated on production. One labelled demo star and planet remain
in the catalog as verification sample data.

## Not fully verified

The cloud browser reports `GL_RENDERER = Disabled` and cannot create a WebGL
context. Thus planet and moon rendering, camera controls, and full visual navigation
remain unverified in a WebGL-capable browser. A graceful fallback now explains the
requirement while leaving authentication available. Do not interpret the passing
API suite as confirmation that these visual checks passed.

Full authenticated researcher form interaction was tested through its live API, not
through entering credentials in the browser UI. Render free services can sleep;
the first request after inactivity may take longer. CDN assets require internet.

## Deployment fixes

Repository-root Render build includes the sibling frontend. Startup applies the
schema transactionally. Observation triggers support inserts and edits. Database
TLS verifies certificates. Database labels are escaped. Auth validation, expiry
handling, viewer logout, dependencies, documentation, and CI were improved.
Secrets are configured on Render, not committed to Git.
