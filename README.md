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

---

## Project Phases (Changelog)

| Phase | Feature |
|---|---|
| 1–5 | UI scaffold, landing page, auth, dashboard, timetable view |
| 6–9 | FastAPI backend, CP-SAT solver, substitute finder |
| 10–11 | Supabase integration, auth wiring, route guards |
| 12–13 | Hybrid CSV + web ingestion, settings page |
| 14 | Generation history page |
| 15 | Tutorial class type support |
| 16 | Dashboard redesign, failure logs |
| 17–18 | CSV/Excel/ICS export, resource heatmap |
| 19–20 | Timetable pinning/shuffling, historical modal |
| 21–22 | Lab continuity constraints, parent-child subgroup conflict |
| 23 | Constraints & Requirements guide page |
| 24 | Dynamic constraints (per-day lunch, per-faculty fatigue, online bypass) |
| 25 | Premium dashboard overhaul (cyber-matrix loader, health checker) |
| 26 | Core data management UI (Rooms/Faculty/Workloads DataGrids) |
| 27 | Faculty portal (real Supabase data, substitute requests) |
| 28 | Notification bell system (real-time Supabase subscription) |
| 29 | Google Calendar OAuth + push-to-calendar |
| 30 | Visual time-grid builder (paint-grid shift/block editor) |
| 31 | Constraint templates & semester snapshots |
| 32 | Soft-delete / archiving for rooms and faculty |
| 33 | **Ghost Resource Layer** — overflow instead of INFEASIBLE |
| 34 | **Bottleneck Diagnostics** — Conflict Refiner Modal |
| 35 | **Production hardening** — pytest suite, GitHub Actions CI |
| 36 | **Multi-tenant onboarding** — register page, per-institution RLS |

---

## License

MIT
