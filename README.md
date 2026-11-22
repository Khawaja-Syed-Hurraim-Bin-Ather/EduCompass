## What is EduCompass?

EduCompass is a web platform for NED University CS/SE/CSE students.

## Project layout

```
frontend/          Main SPA Frontend (port 5173, mirrored on port 3000)
apps/api/          Express 4 (REST API, port 4000)
services/pipeline/ FastAPI + Python (offline ETL, port 8000)
packages/shared/   Zod schemas, shared TypeScript types
packages/engine/   Prerequisite engine (pure TS, no I/O)
packages/gpa/      GPA/CGPA logic (pure TS)
supabase/          SQL migrations
scripts/           sync-env, seed, smoke-test
.agent/STATE.md    Card status and decisions
AGENTS.md          Always-on rules (read this first)
```

## Running locally

```bash
# 1. Sync secrets
node scripts/sync-env.js

# 2. Start everything
pnpm dev           # starts frontend (5173/3000) + api (4000) in parallel

# 3. Python pipeline (only needed for data extraction)
cd services/pipeline
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Key commands

```bash
pnpm dev           # Run main frontend + Express API
pnpm dev:web       # Main frontend only (http://localhost:5173)
pnpm dev:api       # Express API only (http://localhost:4000)
pnpm test          # Run all unit tests
node scripts/smoke-test.mjs  # Run smoke tests
```

## Secrets

Never put secrets in code. Always use `.secrets/env.master` → `node scripts/sync-env.js`.
See AGENTS.md for the full rules.
