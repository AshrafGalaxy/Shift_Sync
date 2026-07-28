# ShiftSync — AI-Driven College Timetable Generator

> Intelligent, constraint-aware timetable generation powered by Google OR-Tools CP-SAT and Next.js.

---

## Overview

ShiftSync is a full-stack SaaS platform that lets college administrators generate conflict-free weekly timetables in seconds. It combines a **Next.js** frontend, a **FastAPI + CP-SAT** solver engine, and a **Supabase** (PostgreSQL) backend into a single, cohesive system.

Key capabilities:
- **CP-SAT Solver** — hard constraints: shift compliance, room clashes, lab continuity, parent-child batch conflicts, fatigue limits
- **Ghost Resource Layer** — overflow slots instead of INFEASIBLE crashes when rooms are missing
- **Bottleneck Diagnostics** — human-readable Conflict Refiner modal when generation fails
- **Substitute Finder** — real-time conflict-aware faculty substitution
- **Google Calendar Sync** — OAuth 2.0 push of generated slots as recurring events
- **Multi-Tenant RLS** — each institution sees only its own data via Supabase Row Level Security
- **Soft-Delete / Archiving** — archive rooms and faculty without data loss
- **Constraint Templates** — save/load full semester configurations as snapshots

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│   Next.js 14  (App Router, TypeScript, Tailwind CSS)        │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│   │Dashboard │  │Timetable │  │ History  │  │  Guide   │  │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ REST (JSON)
┌────────────────────────▼────────────────────────────────────┐
│               FastAPI  (Python 3.11)                        │
│  /api/v1/generate  →  Validator  →  CP-SAT Engine           │
│                                  →  Diagnostics (on fail)   │
│  /api/v1/substitute-search                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Supabase (PostgreSQL)                     │
│  institutions · profiles · rooms · faculty_settings         │
│  workload_items · generated_timetables · notifications      │
│  substitute_requests · constraint_templates                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- A [Supabase](https://supabase.com) project

### 1. Clone
```bash
git clone https://github.com/your-org/SATIS_Shift_Sync.git
cd SATIS_Shift_Sync
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:
```env
# No env vars required by default — engine is stateless.
# Add SUPABASE_URL / SUPABASE_SERVICE_KEY here if you add server-side DB calls.
```

Start the engine:
```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend setup
```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ENGINE_URL=http://localhost:8000

# Optional — Google Calendar OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Start the frontend:
```bash
npm run dev
```

### 4. Database migration
Run `supabase_schema.sql` in your Supabase SQL Editor (top to bottom, once).

---

## Environment Variables Reference

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | frontend | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | frontend | Supabase anon/public key |
| `NEXT_PUBLIC_ENGINE_URL` | frontend | FastAPI base URL (default: `http://localhost:8000`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | frontend | Google OAuth client ID for Calendar sync |
| `GOOGLE_CLIENT_SECRET` | frontend (server route) | Google OAuth client secret |

---

## Running Tests

```bash
cd backend
pytest tests/ -v
```

16 unit tests covering: ghost room fallback, solver status codes, conflict refiner checks, workload divisibility guard.



## License

MIT
