# ShiftSync — AI-Driven College Timetable Generator

<p align="center">
  <img src="https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Google_OR--Tools-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google OR-Tools" />
  <img src="https://img.shields.io/badge/Python_3.11-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</p>

> Intelligent, constraint-aware timetable generation powered by Google OR-Tools CP-SAT, FastAPI, and Next.js 16.

---

## <img src="https://api.iconify.design/lucide:layers.svg?color=%2338bdf8" width="24" height="24" style="vertical-align: middle;" /> System Overview

**ShiftSync** is an enterprise-grade SaaS platform designed for educational institutions to automate weekly timetable generation. The system orchestrates a **Next.js 16** web application, a **FastAPI** constraint solver engine utilizing **Google OR-Tools CP-SAT**, and a **Supabase (PostgreSQL)** database enforcing multi-tenant Row Level Security (RLS).

---

## <img src="https://api.iconify.design/lucide:cpu.svg?color=%2338bdf8" width="24" height="24" style="vertical-align: middle;" /> System Architecture

```mermaid
flowchart TD
    classDef client fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#fff
    classDef engine fill:#0f766e,stroke:#2dd4bf,stroke-width:2px,color:#fff
    classDef database fill:#14532d,stroke:#4ade80,stroke-width:2px,color:#fff

    subgraph Client ["Browser Client — Next.js 16 App Router"]
        UI["Dashboard UI & Timetable Grid"]:::client
        Builder["Constraint & Time-Grid Builder"]:::client
    end

    subgraph Backend ["Solver Engine — FastAPI + Python 3.11"]
        API["REST API (/api/v1/generate)"]:::engine
        Validator["Payload Validator & Pydantic Models"]:::engine
        CPSAT["Google OR-Tools CP-SAT Engine"]:::engine
        Refiner["Conflict Refiner (Diagnostics)"]:::engine
        SubFinder["Substitute Finder Engine"]:::engine
    end

    subgraph DB ["Data & Auth — Supabase PostgreSQL"]
        RLS["Multi-Tenant RLS Access Control"]:::database
        Tables["Institutions · Profiles · Rooms · Faculty · Workloads"]:::database
        History["Generated Timetables & Semester Snapshots"]:::database
    end

    UI -->|JSON HTTP Request| API
    Builder -->|Payload Config| API
    API --> Validator
    Validator --> CPSAT
    CPSAT -- Infeasible State --> Refiner
    CPSAT -- Optimized Schedule --> DB
    UI -->|Direct Queries / Auth| RLS
    RLS --> Tables
    RLS --> History
```

---

## <img src="https://api.iconify.design/lucide:zap.svg?color=%2338bdf8" width="24" height="24" style="vertical-align: middle;" /> Core Capabilities

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

## <img src="https://api.iconify.design/lucide:code-2.svg?color=%2338bdf8" width="24" height="24" style="vertical-align: middle;" /> Technology Stack

<table>
  <tr>
    <td align="center" width="160">
      <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nextjs/nextjs-original.svg" width="48" height="48" alt="Next.js" /><br />
      <b>Next.js 16</b>
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

## <img src="https://api.iconify.design/lucide:terminal.svg?color=%2338bdf8" width="24" height="24" style="vertical-align: middle;" /> Environment Setup

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

## <img src="https://api.iconify.design/lucide:check-circle-2.svg?color=%2338bdf8" width="24" height="24" style="vertical-align: middle;" /> Engine Testing & Verification

Run backend unit tests:
```bash
cd backend
pytest tests/ -v
```

---

## <img src="https://api.iconify.design/lucide:shield-check.svg?color=%2338bdf8" width="24" height="24" style="vertical-align: middle;" /> Copyright Notice

Copyright © 2026 Ashraf. All Rights Reserved.
