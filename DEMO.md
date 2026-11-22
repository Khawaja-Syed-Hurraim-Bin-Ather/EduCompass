# EduCompass — Local Demo Guide (F7)
*Last updated: 2026-10-26 | Built by Ram (syed.hurraim898@gmail.com)*

---

## 🚀 Start Everything (Two Terminals or `pnpm dev`)

To start everything together:
```powershell
pnpm dev
```

Or in separate terminals:

Open **Terminal 1** — Express API:
```powershell
pnpm dev:api
```
Expect: `✅ EduCompass API v1.0 running on http://localhost:4000`

Open **Terminal 2** — Main Frontend:
```powershell
pnpm dev:web
```
Expect: `✅ EduCompass Main Frontend running on http://localhost:5173` (also mirrored on `http://localhost:3000`)

---

## ✅ Smoke Test (all routes in one shot)

With both servers running:
```powershell
node scripts/smoke-test.mjs
```
Expected output: `🎉 All smoke tests passed! EduCompass is fully operational.`

---

## 🗺️ Demo Walkthrough (Tester's Route)

Main Frontend URL: **http://localhost:5173** (or http://localhost:3000)

### 1. Landing Page — http://localhost:5173
- Hero with stats (68 FYPs, 16 professors, 12 career tracks)
- Academic workspace cards
- Integrated Abdul Bari AI guide

### 2. Sign Up / Sign In — http://localhost:5173/#/login
- Institutional sign-in & Student demo login
- Role selection (Vice Chancellor, Department Chairman, Data Entry Operator, Student)

### 3. FYP Portal — http://localhost:5173/#/fyp
- Browse FYP Archive & filter by domain/track
- Project details modal, supervisor links, and similarity drawer

### 4. Professor Directory — http://localhost:5173/#/professors
- 16 faculty profiles with research domains
- Supervisor match score and direct mailto contact draft

### 5. Degree Planner — http://localhost:5173/#/planner
- Interactive 8-semester course sequence
- Prerequisite sequence validation and workload balancer

### 6. Prerequisite Explorer — http://localhost:5173/#/prerequisites
- Course dependency graph and critical path
- What-If simulator for academic dependency tracing

### 7. GPA Calculator — http://localhost:5173/#/planner (or GPA engine)
- Instant semester GPA & CGPA calculation based on NED grading scale

### 8. Career Hub — http://localhost:5173/#/careers
- 12 computing career tracks with milestone roadmaps

### 9. Admin Console — http://localhost:5173/#/admin
- Role-based governance console (Operator draft, Chairman sign-off, VC releases & emergency rollback)

---

## 🔑 F5 — Vercel Deployment Requirements

> **Current goal is working localhost.** Use this section when you're ready to go live.

### Step 1 — Vercel Account (FREE)
Go to https://vercel.com → Sign up with GitHub

### Step 2 — Push to GitHub
```powershell
git init
git add .
git commit -m "feat: EduCompass FYP 2026 complete"
git remote add origin https://github.com/YOUR_USERNAME/educompass.git
git push -u origin main
```

### Step 3 — Vercel Project Settings
| Setting | Value |
|---|---|
| Framework | Next.js (auto-detected) |
| Root Directory | `apps/web` |
| Build Command | `cd ../.. && pnpm build --filter=@educompass/web...` |
| Node.js version | 20.x |

### Step 4 — Vercel Environment Variables (safe/public ones only)
| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from your `.env` | Public — safe |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from your `.env` | Public — safe |
| `NEXT_PUBLIC_SITE_URL` | `https://yourapp.vercel.app` | Set after first deploy |
| `NEXT_PUBLIC_API_URL` | `https://your-api.onrender.com` | After Express deploy |

> ⚠️ **Rule #11**: `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `XAI_API_KEY` NEVER go in `NEXT_PUBLIC_` vars. They live only on Render.

### Step 5 — Deploy Express API to Render (FREE)
1. Go to https://render.com → New **Web Service**
2. Connect the same GitHub repo, **Root Directory**: `apps/api`
3. **Build**: `pnpm install --frozen-lockfile && pnpm build`
4. **Start**: `pnpm start`
5. **Environment Variables** (server-only):

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Your `.env` (the https://... URL) |
| `SUPABASE_SERVICE_ROLE_KEY` | Your `.env` |
| `GEMINI_API_KEY` | Your `.env` |
| `XAI_API_KEY` | Your `.env` |
| `ALLOWED_ORIGINS` | Your Vercel URL |
| `NODE_ENV` | `production` |
| `LLM_MAX_INPUT_CHARS` | `300` |
| `LLM_MAX_OUTPUT_TOKENS` | `500` |
| `LLM_USER_DAILY_LIMIT` | `20` |
| `LLM_GLOBAL_DAILY_BUDGET` | `100` |

### Step 6 — Supabase Auth Redirect URLs
In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://yourapp.vercel.app`
- **Redirect URLs**: Add `https://yourapp.vercel.app/**`

---

## 🔬 Security Features Active (F6)

| Feature | Status |
|---|---|
| CSP / HSTS / X-Frame / nosniff headers (Next.js) | ✅ |
| Helmet.js on Express | ✅ |
| CORS strict allow-list | ✅ |
| Auth rate limiter: 10 req / 15 min | ✅ |
| Chat rate limiter: 30 req / 15 min | ✅ |
| Write rate limiter: 60 req / 15 min | ✅ |
| Request sanitizer (null bytes, control chars) | ✅ |
| 10kb request body cap | ✅ |
| Security event logger (no secrets) | ✅ |
| Error sanitizer (no stack traces in prod) | ✅ |
| Supabase RLS on all tables | ✅ |
| JWT + requireRole() on all protected routes | ✅ |

---

## 📋 Final Card Status

| Card | Feature | Status |
|---|---|---|
| F1 | Monorepo scaffold | ✅ Done |
| F2 | Database schema + migrations | ✅ Done |
| F3 | Supabase Auth + requireRole | ✅ Done |
| F5 | Deployment guide | 📋 Guide above |
| **F6** | **Security hardening** | ✅ Done |
| **F7** | **Integration + demo** | ✅ Done |
| E1 | Design system | ✅ Done |
| E2 | Career Hub | ✅ Done |
| E3 | Legal pages | ✅ Done |
| E4 | GPA Calculator | ✅ Done |
| E5 | FYP Portal v1 | ✅ Done |
| H1 | Prerequisite Engine | ✅ Done |
| H2 | Prerequisite Explorer | ✅ Done |
| H3 | AI Chatbot | ✅ Done |
| M1 | FYP Advanced (similarity + team board) | ✅ Done |
| M2 | Professor Directory | ✅ Done |
| M3 | Student Planner | ✅ Done |
| M4 | Admin Console | ✅ Done |
