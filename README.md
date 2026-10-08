# 🌌 Celestial Voyager — Habitable Planet System

An interactive **3D Solar System and planetary exploration experience**, paired with a **researcher-facing star/planet database** and a simplified educational habitability calculator.

**Live demo:** Add your Render URL after deployment.
**Source:** https://github.com/sxfxr/Habitable-Planet-System

## Features

- Animated 3D Solar System: Sun, eight planets, orbits, camera tracking, planet facts, and guided exploration
- Explore Earth's Moon; Jupiter's Io, Europa, Ganymede, and Callisto; Saturn's Titan and Enceladus
- Moon close-ups, distinct surface treatments, orbit animation, responsive controls
- Researcher and viewer roles with JWT authentication
- PostgreSQL star/planet/observation records and researcher create/update workflows
- Simplified habitable-zone classification for educational use

> The 3D Solar System exhibit is illustrative and separate from the researcher database. Orbital scales, sizes, surface appearances and animations are intentionally stylized. The classification is **not** a scientifically validated habitability prediction.

## Stack

**Frontend:** HTML, CSS, JavaScript, Three.js, Tailwind CDN.
**Backend:** Node.js 24, Express 5, JWT, bcrypt.
**Database:** PostgreSQL 18 locally; hosted PostgreSQL (e.g. Neon) in production.
**Hosting:** One Render web service serves both frontend and backend, avoiding cross-origin configuration.

## Pages

- `/` or `/za.html` — 3D explorer
- `/login.html` — register/login
- `/researcher.html` — researcher interface
- `/api/health` — database connectivity check
- `/api/stars` — public star list

## Local setup

1. Install Node.js 24 and PostgreSQL.
2. Create database `habitable_planets` and run `Backend/schema.sql` or use `npm run db:migrate` after configuring the environment (existing databases need not be recreated).
3. In `Backend`, copy `.env.example` to `.env` and configure `DB_*`, a random `JWT_SECRET` of at least 24 characters, and a **different** `RESEARCHER_SIGNUP_KEY`.
4. Run:

```bash
cd Backend
npm ci
npm test
npm start
```

5. Open **http://localhost:5000/**. Both UI and API now use the **same origin**. Do not use a separate port-8000 static server for this deployment-ready version.

## Deployment: Render + Neon (free tiers, subject to provider limits)

The repository includes `render.yaml` to deploy the entire app as **one Render web service**.

1. Create a free Neon PostgreSQL project. Copy its connection string privately (do not commit it). Neon credentials are different from local PostgreSQL credentials.
2. Open the Neon SQL editor and execute `Backend/schema.sql`. This creates the tables and observation triggers; it does **not** copy your local data.
3. Push this project to your GitHub repository. Confirm `.env` and `node_modules` are not committed.
4. In Render, choose **New → Blueprint** and connect the repository. Review the `render.yaml` service.
5. Provide the secret `DATABASE_URL` using Neon's pooled connection string if offered. Render generates random `JWT_SECRET` and `RESEARCHER_SIGNUP_KEY` automatically; keep both private. If the Blueprint interface does not generate them, set them manually to independent random values.
6. Deploy. Visit `https://YOUR-RENDER-SERVICE.onrender.com/api/health` and verify `{ "status": "ok", "database": "connected" }`. Open the same URL without `/api/health` to explore the app.
7. Register a viewer, then register a researcher with the private researcher invitation key. Test login, creating/editing a star and planet, and calculating an observation. **Never publish the invitation key.**
8. Add the actual live URL and screenshots to this README and your GitHub repository description.

**Important:** Render free web services may sleep when idle and wake slowly. Free plans and quotas can change. Keep a database backup. This is a portfolio/demo setup, not a hardened multi-tenant production service. In-memory authentication rate limiting resets on restart and is not a replacement for a shared production rate limiter.

### Optional: copy your existing local data

Only if you want to preserve local stars, planets, users, and observations: export with `pg_dump` and import to Neon using `psql` or `pg_restore` according to the dump format. **Do not upload your database dump to GitHub**: it may include user password hashes and personal records. Prefer a fresh hosted database for a public demo.

## Project structure

```text
Habitable-Planet-System/
├── frontend/
│   ├── za.html
│   ├── login.html
│   ├── researcher.html
│   └── assets/
├── Backend/
│   ├── index.js
│   ├── db.js
│   ├── schema.sql
│   ├── tests/
│   ├── .env.example
│   └── package.json
├── render.yaml
└── README.md
```

## API and security notes

- Viewer signup is public; researcher signup requires the server-side invitation key.
- Protected write endpoints require a valid researcher JWT.
- Set secrets only in Render's environment settings or a local ignored `.env` file.
- `/api/health` verifies connectivity and the four required tables.
- `npm test` includes mocked API checks and an embedded PostgreSQL (PGlite) integration suite covering authentication, permissions, researcher writes, and observation triggers. Live browser and Neon connectivity checks are separate deployment gates.
- External CDN assets (Three.js, Tailwind, Google Fonts) require internet access.

## Portfolio description

Built an interactive 3D planetary exploration platform with Three.js and an Express/PostgreSQL backend. Implemented animated orbital visualization, moon exploration, JWT-based researcher authentication, REST APIs, and a simplified educational planetary habitability assessment.

## Deployment configuration

Keep Render's root directory blank. Build from the repository root with
`npm ci --include=dev --prefix Backend && npm test --prefix Backend` and start with
`npm run deploy:start --prefix Backend`. The start command applies the schema in
an advisory-locked transaction before accepting requests. Failed migrations stop startup.
Use the **Free** web-service plan and a Neon **Free** project; no paid database or
persistent Render disk is needed. Set the health-check path to `/api/health`.

Production database TLS verifies the server certificate and hostname. No credentials
belong in Git. Generate independent random JWT and researcher invitation secrets.
Retrieve the invitation key privately from Render when you need to register a researcher.
The application starts with an empty research catalog; its built-in Solar System and
seven moon exhibits remain available independently of the catalog.

See [verification status](TEST_REPORT.md) and [deployment checklist](DEPLOY_CHECKLIST.md).
