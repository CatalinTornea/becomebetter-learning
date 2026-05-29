# 🚀 Setup Guide - AdaptiveOps Platform

Ghid complet pentru a porni platforma locală și pe production.

## Prerequisite-uri

- **Node.js**: v20 sau mai nou (check cu `node -v`)
- **npm**: v10 sau mai nou (check cu `npm -v`)
- **PostgreSQL**: v15 sau mai nou (local sau Neon/Supabase)
- **Claude API Key**: Din https://console.anthropic.com/

## 🏠 Local Setup (Windows)

### Step 1: Clone & Dependencies

```bash
# Deschide terminal în folder proiect
cd "C:\Users\Catalin\Desktop\site alina"

# Instalează dependențe (poate dura 2-3 min)
npm install
```

### Step 2: Configurare Variabile de Mediu

```bash
# Copiază fișierul exemplu
copy .env.example .env
```

Editează `.env` cu editorului (VS Code):
```env
# DATABASE
DATABASE_URL="postgresql://postgres:password@localhost:5432/adaptiveops"

# JWT (generează random strings sigure)
JWT_SECRET="your-super-secret-key-12345"
JWT_REFRESH_SECRET="your-refresh-secret-key-67890"

# API
API_PORT=4000

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:4000"

# AI (din Anthropic console)
ANTHROPIC_API_KEY="sk-ant-v0-xxxxxxxxxxxx"
```

**Obține API Key Claude:**
1. Mergi la https://console.anthropic.com/
2. Sign in / Sign up
3. Click "API Keys" în stânga
4. Click "+ Create Key"
5. Copiează key-ul în `.env` ANTHROPIC_API_KEY

### Step 3: Setup PostgreSQL

**Opțiunea A: PostgreSQL Local (Windows)**

1. Descarcă instalator: https://www.postgresql.org/download/windows/
2. Rulează installer
3. Noteaza password-ul pentru `postgres` user
4. Acceptă default port 5432
5. După instalare, start PostgreSQL din Services (Windows Start → Services)

**Opțiunea B: Neon (Recomanded - Cloud)**

1. Mergi la https://neon.tech/
2. Sign up cu email
3. Create project "adaptiveops"
4. Copy connection string:
   ```
   postgresql://user:password@host/dbname
   ```
5. Paste în `.env` DATABASE_URL

### Step 4: Inițializare Bază de Date

```bash
# Generează Prisma client
npm run prisma:generate

# Creează tabele (ruleaza migrări)
npm run prisma:migrate

# Încarcă data demo (5 minute)
npm run prisma:seed
```

Output ar trebui să arate:
```
✅ Seed data created successfully!
👤 COACH ACCOUNT:
   Email: coach@adaptiveops.io
   Password: coach1234
👤 STUDENT ACCOUNT:
   Email: student@adaptiveops.io
   Password: student1234
```

### Step 5: Pornire Aplicație

```bash
# Start dev server (ambii - frontend + backend)
npm run dev
```

Ar trebui să vadă:
```
> web:dev: ready - started server on 0.0.0.0:3000
> api:dev: started on port 4000
```

### Step 6: Test Application

**Frontend:** Deschide browser la http://localhost:3000

1. Click "Sign In"
2. Login cu student@adaptiveops.io / student1234
3. Mergi la "Practice"
4. Selectează modul
5. Alege scenario "Rebut la linia de asamblare"
6. Scrie un răspuns (min 10 cuvinte)
7. Click "Submit for AI Evaluation"
8. Așteptă feedback AI (30-60 sec)

## 🌐 Deploy pe Production

### Frontend - Vercel

1. Push code pe GitHub
2. Mergi la https://vercel.com/
3. Import GitHub project
4. Configure environment:
   ```
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```
5. Deploy (auto-deploy pe push)

### Backend - Railway / Render

#### Railway (Recomandat - simplu)

1. Mergi la https://railway.app/
2. Connect GitHub
3. Select repository
4. Auto-detect Next.js + Node.js
5. Add PostgreSQL
6. Configure environment variables:
   ```
   DATABASE_URL=from Railway Postgres
   JWT_SECRET=generate secure string
   ANTHROPIC_API_KEY=your-key
   API_PORT=5000
   NEXT_PUBLIC_API_URL=https://your-api.railway.app
   ```
7. Deploy button

#### sau Render

1. https://render.com/
2. Create Web Service
3. Connect GitHub
4. Build command: `npm run build`
5. Start command: `npm start -w @adaptiveops/api`

### Database - Neon

1. https://neon.tech/
2. Create new project
3. Copy connection string
4. Set DATABASE_URL în backend env vars

## 🔍 Troubleshooting

### Error: "Cannot find module 'prisma'"
```bash
npm install
npm run prisma:generate
```

### Error: "Connection to PostgreSQL failed"
- Check DATABASE_URL în .env
- Verify PostgreSQL is running
- Test connection: `psql postgres://user:pass@host/db`

### Error: "ANTHROPIC_API_KEY is undefined"
- Set ANTHROPIC_API_KEY în .env
- Restart dev server (`npm run dev`)

### Frontend won't connect to backend
- Check NEXT_PUBLIC_API_URL în .env
- Verify backend running på http://localhost:4000
- Check browser console for CORS errors

### AI Grading returns 500 error
- Check ANTHROPIC_API_KEY valid
- Verify Claude API quota not exceeded
- Check response length > 10 characters

## 📊 Database Reset

Dacă vrei să resetezi totul:

```bash
# Reset DB (șterge toate date)
npm run prisma:migrate reset

# Sau manual:
# - Conectează-te la PostgreSQL
# - `DROP DATABASE adaptiveops;`
# - `CREATE DATABASE adaptiveops;`
# - `npm run prisma:migrate`
```

## 🚨 Production Checklist

- [ ] DATABASE_URL points to production DB
- [ ] JWT_SECRET is long & random (32+ chars)
- [ ] ANTHROPIC_API_KEY configured
- [ ] NEXT_PUBLIC_API_URL correct domain
- [ ] SSL/HTTPS enabled
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Error logging configured

## 📱 Testing Scenarios

### Scenario 1: Student Practice
1. Login ca student
2. Go to Practice → select module
3. Choose "Rebut la linia de asamblare"
4. Submit response
5. View AI feedback

### Scenario 2: Coach Create Content
1. Login ca coach@adaptiveops.io
2. Create new course
3. Add module
4. Create scenario with rubrics
5. Verify students can see it

### Scenario 3: Progress Tracking
1. Complete multiple scenarios
2. Check dashboard progress
3. Verify scores saved

## 🆘 Support

**Logs to check:**
- Frontend errors: Browser DevTools (F12 → Console)
- Backend logs: Terminal window where `npm run dev` runs
- Database: Check connection string in .env

**Quick debug:**
```bash
# Test API
curl http://localhost:4000/health

# Check DB
npm run prisma:studio

# Verify Claude
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}'
```

---

**Gata! 🎉** Platforma ar trebui să funcționeze. Dacă ai probleme, check terminal logs sau browser console pentru detalii de eroare.
