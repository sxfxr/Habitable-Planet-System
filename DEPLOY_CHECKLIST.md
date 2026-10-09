# Deployment checklist

- [x] GitHub updated while preserving repository history
- [x] Neon Free database schema and observation triggers applied
- [x] Render Free service created in Singapore
- [x] DATABASE_URL, JWT_SECRET, RESEARCHER_SIGNUP_KEY set privately
- [x] Live API database connectivity verified
- [x] Live viewer registration/login and role restrictions verified
- [x] Live researcher star/planet editing and calculations verified through API
- [x] README includes public URL and truthful verification status
- [ ] Full planet and moon exploration on a WebGL-capable browser
- [ ] Successful production invitation signup and authenticated form UI walkthrough

See TEST_REPORT.md for exact coverage. Render uses its default port health check;
`/api/health` is available and verified separately. The Blueprint declares the
application health route for future Blueprint-managed deployments.
