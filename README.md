# ShiftSync — AI-Driven College Timetable Generator

<p align="center">
  <img src="https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Google_OR--Tools-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google OR-Tools" />
  <img src="https://img.shields.io/badge/Python_3.11-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</p>

> Intelligent, constraint-aware timetable generation powered by Google OR-Tools CP-SAT, FastAPI, and Next.js 14.

---

## <img src="https://raw.githubusercontent.com/primer/octicons/main/icons/project-24.svg" width="22" height="22" /> System Overview

**ShiftSync** is an enterprise-grade SaaS platform designed for educational institutions to automate weekly timetable generation. The system orchestrates a **Next.js 14** web application, a **FastAPI** constraint solver engine utilizing **Google OR-Tools CP-SAT**, and a **Supabase (PostgreSQL)** database enforcing multi-tenant Row Level Security (RLS).

---

## <img src="https://raw.githubusercontent.com/primer/octicons/main/icons/cpu-24.svg" width="22" height="22" /> System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser Client                            │
│   Next.js 14 (App Router · TypeScript · Tailwind CSS · React)   │
│   ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐    │
│   │ Dashboard UI │  │ Timetable Grid│  │ Constraint Settings │    │
│   └──────────────┘  └──────────────┘  └─────────────────────┘    │
└────────────────────────────────┬─────────────────────────────────┘
                                 │ REST API (JSON)
┌────────────────────────────────▼─────────────────────────────────┐
│                    FastAPI Engine (Python 3.11)                  │
│                                                                  │
│  /api/v1/generate                                                │
│    ├── Validator & Payload Builder                               │
│    ├── CP-SAT Solver (Google OR-Tools Engine)                    │
│    └── Bottleneck Diagnostics (Conflict Refiner on Fail)        │
│                                                                  │
│  /api/v1/substitute-search                                       │
│    └── Real-time Faculty Conflict Checker                        │
└────────────────────────────────┬─────────────────────────────────┘
                                 │ Direct Client & Server Queries
┌────────────────────────────────▼─────────────────────────────────┐
│                    Supabase (PostgreSQL)                         │
│  • Institutions & Profiles (Multi-Tenant RLS)                    │
│  • Rooms, Faculty Settings & Workload Items                      │
│  • Generated Timetables & Semester Snapshots                     │
│  • Notifications & Substitute Requests                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## <img src="https://raw.githubusercontent.com/primer/octicons/main/icons/zap-24.svg" width="22" height="22" /> Core Capabilities

### Constraint Satisfaction Engine (CP-SAT)
- Enforces multi-dimensional hard constraints: shift compliance, room allocation, lab continuity, parent-child batch conflicts, and faculty workload bounds.

### Ghost Resource Layer
- Implements dynamic overflow management to prevent solver `INFEASIBLE` states when physical room capacity is constrained.

### Bottleneck Diagnostics & Conflict Refiner
- Provides human-readable diagnostic analysis pinpointing exact constraint collisions during unsolvable scheduling scenarios.

### Faculty Substitution Engine
- Performs real-time, conflict-aware matching to identify eligible substitute faculty for unassigned lecture slots.

### Google Calendar Synchronization
- Integrates OAuth 2.0 protocol for automated export of generated schedules into Google Calendar.

### Multi-Tenant Architecture & Security
- Enforces strict institutional data isolation via Supabase PostgreSQL Row Level Security (RLS) policies.

---

## <img src="https://raw.githubusercontent.com/primer/octicons/main/icons/code-24.svg" width="22" height="22" /> Technology Stack

<table>
  <tr>
    <td align="center" width="160">
      <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nextjs/nextjs-original.svg" width="48" height="48" alt="Next.js" /><br />
      <b>Next.js 14</b>
    </td>
    <td align="center" width="160">
      <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/typescript/typescript-original.svg" width="48" height="48" alt="TypeScript" /><br />
      <b>TypeScript</b>
    </td>
    <td align="center" width="160">
      <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/tailwindcss/tailwindcss-original.svg" width="48" height="48" alt="Tailwind CSS" /><br />
      <b>Tailwind CSS</b>
    </td>
    <td align="center" width="160">
      <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg" width="48" height="48" alt="Python" /><br />
      <b>Python 3.11</b>
    </td>
  </tr>
  <tr>
    <td align="center" width="160">
      <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/fastapi/fastapi-original.svg" width="48" height="48" alt="FastAPI" /><br />
      <b>FastAPI</b>
    </td>
    <td align="center" width="160">
      <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/supabase/supabase-original.svg" width="48" height="48" alt="Supabase" /><br />
      <b>Supabase</b>
    </td>
    <td align="center" width="160">
      <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/postgresql/postgresql-original.svg" width="48" height="48" alt="PostgreSQL" /><br />
      <b>PostgreSQL</b>
    </td>
    <td align="center" width="160">
      <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/google/google-original.svg" width="48" height="48" alt="Google Cloud" /><br />
      <b>Google OR-Tools</b>
    </td>
  </tr>
</table>

---

## <img src="https://raw.githubusercontent.com/primer/octicons/main/icons/terminal-24.svg" width="22" height="22" /> Environment Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- Supabase Project Instance

### 1. Repository Setup
```bash
git clone https://github.com/AshrafGalaxy/Shift_Sync.git
cd Shift_Sync
```

### 2. Backend Engine Installation
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Frontend Web Client Installation
```bash
cd ../frontend
npm install
```

Configure `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ENGINE_URL=http://localhost:8000

# Optional — Google Calendar OAuth Integration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Launch development environment:
```bash
npm run dev
```

### 4. Database Schema Migration
Execute `supabase_schema.sql` in the Supabase SQL Editor.

---

## <img src="https://raw.githubusercontent.com/primer/octicons/main/icons/verified-24.svg" width="22" height="22" /> Engine Testing & Verification

Run backend unit tests:
```bash
cd backend
pytest tests/ -v
```

---

## <img src="https://raw.githubusercontent.com/primer/octicons/main/icons/shield-24.svg" width="22" height="22" /> Copyright Notice

Copyright © 2026 Ashraf. All Rights Reserved.
