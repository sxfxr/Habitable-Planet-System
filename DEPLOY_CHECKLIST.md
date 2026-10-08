# Final deployment checklist

- [ ] Create Neon project and run `Backend/schema.sql` in Neon SQL editor
- [ ] Push project to GitHub (without `.env` or `node_modules`)
- [ ] Connect GitHub repo to Render Blueprint (`render.yaml`)
- [ ] Set `DATABASE_URL` privately; confirm auto-generated secrets
- [ ] Check `/api/health` returns database connected
- [ ] Open `/` and test Solar System, planet and moon navigation
- [ ] Test viewer registration and login
- [ ] Test researcher signup with private key and researcher editing
- [ ] Add live URL and screenshots to README and GitHub About
- [ ] Back up any important database records

A public URL and third-party service accounts cannot be created solely by downloading this ZIP. You must authorize GitHub/Render/Neon account connections and set the hosted database URL.
