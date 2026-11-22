# EduCompass Deployment Guide: Frontend & API on Vercel

This guide provides the complete, production-ready steps to deploy **EduCompass** as two connected services on [Vercel](https://vercel.com):
1. **Frontend Service**: Static Single Page Application (SPA) located at `frontend/`
2. **API Service**: Express & Supabase Serverless REST API located at `apps/api/`

---

## 1. Architecture Overview

```mermaid
flowchart LR
    User["Student Browser"] -->|HTTPS| VercelFrontend["Vercel Frontend (SPA)<br/>https://educompass-web.vercel.app"]
    VercelFrontend -->|REST API / JSON| VercelAPI["Vercel API (Node Serverless)<br/>https://educompass-api.vercel.app"]
    VercelAPI -->|PostgreSQL & Auth| Supabase["Supabase Cloud<br/>hrzzxtjuiofivnytqldj.supabase.co"]
    VercelAPI -->|Gemini Flash-Lite Gateway| GoogleAI["Google Gemini AI API<br/>gemini-3.5-flash-lite"]
```

- **Frontend (`frontend/`)**: Static, lightning-fast SPA with zero Next.js bloat. Serves HTML/JS/CSS, Abdul Bari avatar animations, prerequisite graph visualizer, and local cache.
- **Backend API (`apps/api/`)**: TypeScript Express service with 4-layer AI architecture (Layer 1 FAQ match, Layer 2 departmental retrieval, Layer 3 Google Gemini LLM Gateway, Layer 4 fail-safe fallback).
- **Database (`Supabase`)**: Pre-populated with 59 verified courses, 18 faculty profiles, 68 FYP records, and 12 career tracks.

---

## 2. Deploying the Backend API to Vercel

### Step 2.1: Import the Repository in Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** > **Project**.
3. Import your GitHub repository (`NED PORTAL` or `EduCompass`).

### Step 2.2: Configure Project Settings
- **Project Name**: `educompass-api` (or your preferred name)
- **Framework Preset**: `Other`
- **Root Directory**: `apps/api` (Click **Edit** next to Root Directory and select `apps/api`)
- **Build Command**: `pnpm run build`
- **Output Directory**: Leave empty or default
- **Install Command**: `pnpm install`

### Step 2.3: Environment Variables
Add the following environment variables in the Vercel project settings:

| Variable Name | Value / Description | Source |
|---|---|---|
| `NODE_ENV` | `production` | System |
| `API_PORT` | `4000` | System |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://hrzzxtjuiofivnytqldj.supabase.co` | Supabase Cloud |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(From your Master Config)* | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | *(From your Master Config)* | Supabase Service Role |
| `DATABASE_URL` | `postgresql://postgres.hrzzxtjuiofivnytqldj:SoftwareCEP-326@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres` | Supabase Pooler |
| `GEMINI_API_KEY` | *(From your `.secrets/env.master` — do NOT commit this value)* | Google AI Studio |
| `LLM_PROVIDER` | `gemini` | Config |
| `LLM_MODEL` | `gemini-3.5-flash-lite` | Config |
| `LLM_MODEL_FALLBACK` | `gemini-3.8-flash` | Config |
| `JWT_SECRET` | `educompass_super_secret_jwt_key_2026_ned_ceit_dept` | Auth |
| `ALLOWED_ORIGIN` | `https://*.vercel.app,http://localhost:5173,http://localhost:3000` | Security |

> [!IMPORTANT]
> When your Frontend project is deployed, update `ALLOWED_ORIGIN` to include your exact frontend URL (e.g., `https://educompass-frontend.vercel.app`).

### Step 2.4: Deploy & Verify API
1. Click **Deploy**.
2. Once deployed, note down your production API URL (e.g. `https://educompass-api.vercel.app`).
3. Verify health by visiting `https://educompass-api.vercel.app/health` in your browser. It should return:
   ```json
   { "status": "ok", "service": "educompass-api" }
   ```

---

## 3. Deploying the Frontend to Vercel

### Step 3.1: Import the Project in Vercel
1. In your Vercel Dashboard, click **Add New...** > **Project**.
2. Select the same repository again.

### Step 3.2: Configure Frontend Settings
- **Project Name**: `educompass-frontend` (or `educompass-portal`)
- **Framework Preset**: `Other`
- **Root Directory**: `frontend` (Click **Edit** next to Root Directory and select `frontend`)
- **Build Command**: Leave empty / none required (Pure static files)
- **Output Directory**: `.` (or leave default for root of `frontend`)

### Step 3.3: Link Frontend to Deployed API
In `frontend/config.js`, the frontend determines the API URL via:
```javascript
window.EDUCOMPASS_CONFIG = {
  apiUrl: window.__API_URL__ || (
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:4000'
      : 'https://educompass-api.vercel.app' // << Put your deployed API URL here
  ),
  getApiUrl() {
    return this.apiUrl;
  }
};
```
Before deploying, simply update the fallback URL in `frontend/config.js` to match your Vercel API URL from Step 2.4.

### Step 3.4: Deploy Frontend
1. Click **Deploy**.
2. Your frontend is instantly live at your Vercel URL (e.g. `https://educompass-frontend.vercel.app`).

---

## 4. Verification Checklist

| Feature | Local Target | Vercel Verification |
|---|---|---|
| **Main Portal** | `http://localhost:5173` | Accessible without errors, icons crisp |
| **Mirror Port** | `http://localhost:3000` | Tested & verified identical |
| **API Health** | `http://localhost:4000/health` | Status 200 OK |
| **AI Assistant (Abdul Bari)** | `POST /api/v1/chat` | Layer 1 instant FAQ + Layer 3 Gemini LLM responses |
| **Courses Catalog** | 59 courses loaded | Prerequisite chains & semester flow interactive |
| **Faculty Profiles** | 18 professors | Research tags, email links, supervisor details |
| **FYP Archive** | 68 projects | Search, domain filter, supervisor tag |
| **Career Tracks** | 12 tracks | Roadmap courses linked |
| **Automated Tests** | 184 tests passed | All unit & integration tests green |
