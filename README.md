# AdaptiveOps Learning Platform

Platformă de e-learning cu scenarii practice evaluate de AI, inspirată de AdaptiveOps Academy.

## 🎯 Caracteristici

- **Curse structurate** - Organizate în module cu video și conținut
- **Scenarii practice** - Probleme real-world cu răspunsuri evaluate de AI
- **Evaluare AI** - Claude AI evaluează răspunsuri după rubrice definite
- **Feedback detaliat** - Feedback individual pe fiecare criteriu de evaluare
- **Sistem de progres** - Tracking completării curselor și scoruri
- **Managementul rubrici** - Defineți criterii de evaluare personalizate

## 🏗️ Arhitectură

Monorepo cu:
- `apps/web` - Frontend Next.js 15 (React)
- `apps/api` - Backend Node.js + Express
- `packages/shared` - Tipuri TypeScript comune

## 📋 Cerințe

- Node.js 20+
- npm 10+
- PostgreSQL 15+
- API Key Claude (Anthropic)

## 🚀 Setup local

### 1. Configurare variabile de mediu

```bash
# Copiază exemplul
cp .env.example .env

# Editează .env cu:
DATABASE_URL="postgresql://user:password@localhost:5432/adaptiveops"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
ANTHROPIC_API_KEY="your-claude-key"
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

**Obține API Key Claude**: https://console.anthropic.com/

### 2. Instalare dependențe

```bash
npm install
```

### 3. Setup bază de date

```bash
# Generează client Prisma
npm run prisma:generate

# Ruleaza migrări
npm run prisma:migrate

# Încarcă date demo
npm run prisma:seed
```

### 4. Pornește aplicația

```bash
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

## 👤 Test Accounts (după seed)

**Coach (poate crea scenarii):**
- Email: `coach@adaptiveops.io`
- Password: `coach1234`

**Student (practice scenarios):**
- Email: `student@adaptiveops.io`
- Password: `student1234`

## 🧪 Teste

```bash
npm test
```

## 📱 Flows Principale

### Student Practice
1. Login → Dashboard
2. Selectează curs → modul
3. Accesează "Practice" tab
4. Alege scenario
5. Citește problem statement și coaching materials
6. Scrie răspuns
7. Submit → AI evaluation
8. Primește feedback pe fiecare rubric

### Coach Setup
1. Login ca Coach
2. Crează curs și module
3. Pentru fiecare modul:
   - Adaugă scenarii cu problem statement
   - Defineți 3-4 rubrice de evaluare
   - Adaugă coaching materials

## 🔌 API Endpoints

### Scenarios
```
POST   /scenarios                  - Crează scenario (Coach)
GET    /scenarios/:scenarioId      - Obține scenario
GET    /scenarios/module/:moduleId - Lista scenarios ale unui modul
POST   /scenarios/submit           - Submit răspuns pentru evaluare AI
GET    /scenarios/feedback/:responseId - Obține feedback

PATCH  /scenarios/:scenarioId      - Update scenario (Coach)
DELETE /scenarios/:scenarioId      - Șterge scenario (Coach)
```

### Courses & Modules
```
GET    /courses                    - Lista curse
GET    /courses/:courseId          - Obține curs cu module
POST   /courses                    - Crează curs (Coach)
```

## 🤖 AI Grading System

- **Provider**: Anthropic Claude 3.5
- **Sistem**: Prompt-based evaluation cu rubrice
- **Output**: 
  - Overall score (0-100)
  - Individual rubric scores
  - Personalized feedback per rubric
  - General coaching notes

Exemplu prompt în `apps/api/src/lib/aiGrader.ts`

## 📦 Deploy

### Frontend (Vercel)
```bash
# Vercel auto-deploy din Git
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Backend (Railway/Render)
```bash
# Environment variables:
DATABASE_URL=postgresql://...
JWT_SECRET=...
ANTHROPIC_API_KEY=...
```

### Database (Neon/Supabase)
- PostgreSQL managed
- Auto-backups incluse

## 📚 Structura Models

```prisma
User (STUDENT, COACH)
├── Progress (per module)
├── QuizAttempt (evaluări quiz)
└── ScenarioResponse (evaluări AI)

Course
├── Module
│   ├── Quiz (multiple choice)
│   ├── Scenario
│   │   ├── Rubric
│   │   └── Response → RubricScore

Scenario
├── Rubric (criterii evaluare)
└── Response (student answers)
    └── RubricScore (score per rubric)
```

## 🛠️ Development

```bash
# Dev mode cu hot-reload
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Migrations
npm run prisma:migrate -- --name feature_name
```

## 🎓 Exemplu Caz Utilizare

**Curs**: Operational Excellence
**Modul**: Problem-Solving Fundamentals
**Scenario**: "Rebut la linia de asamblare"

Rubrice:
1. IMPACT Assessment - Evaluează cost/impact
2. Root Cause - Identifică cauzele
3. Corrective Action - Măsuri de prevenție
4. Communication - Plan de notificare client

Coaching Materials includ:
- Context operational real
- Documentații de referință
- Timeline-uri critice
- Resurse disponibile

## 📝 License

MIT

## 🤝 Support

Pentru probleme: check logs în `apps/api` şi browser console

