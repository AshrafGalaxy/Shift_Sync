# ShiftSync — AI-Driven College Timetable Generator

<p align="center">
  <img src="https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Google_OR--Tools-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google OR-Tools" />
  <img src="https://img.shields.io/badge/Python_3.11-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

> Intelligent, constraint-aware timetable generation powered by Google OR-Tools CP-SAT, FastAPI, and Next.js 14.

---

## 📌 Overview

**ShiftSync** is a full-stack SaaS platform that allows college administrators to generate conflict-free weekly timetables in seconds. It seamlessly connects a modern **Next.js** frontend with a high-performance **FastAPI + CP-SAT** constraint solver engine and a **Supabase** (PostgreSQL) backend protected by multi-tenant Row Level Security (RLS).

---

## 🏗️ System Architecture

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

## ✨ Key Features

- ⚙️ **CP-SAT Solver Engine**: Enforces hard constraints including shift compliance, room clashes, lab continuity, parent-child batch conflicts, and faculty fatigue limits.
- 👻 **Ghost Resource Layer**: Prevents `INFEASIBLE` solver crashes by utilizing overflow slots when physical rooms are missing or constrained.
- 🔍 **Bottleneck Diagnostics**: Generates a human-readable Conflict Refiner breakdown detailing exactly which constraints caused a generation failure.
- 🔄 **Smart Substitute Finder**: Real-time conflict-aware search to identify eligible substitute faculty for unassigned slots.
- 📅 **Google Calendar Sync**: OAuth 2.0 integration allowing one-click export of scheduled slots directly to Google Calendar.
- 🔐 **Multi-Tenant RLS**: Row Level Security ensures complete data isolation per institution.
- 📁 **Constraint Templates & Snapshots**: Save, load, and restore semester-wide timetable configurations.
- 🗃️ **Soft-Delete & Archiving**: Safely archive rooms and faculty without losing historical schedule data.

---

## 🛠️ Technology Stack

| Category | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons |
| **Backend API** | Python 3.11, FastAPI, Uvicorn, Pydantic |
| **Constraint Solver** | Google OR-Tools (CP-SAT Solver Engine) |
| **Database & Auth** | Supabase (PostgreSQL), Row Level Security (RLS) |
| **Integrations** | Google Calendar API (OAuth 2.0) |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 20+
- Python 3.11+
- A [Supabase](https://supabase.com) project

### 1. Clone Repository
```bash
git clone https://github.com/AshrafGalaxy/Shift_Sync.git
cd Shift_Sync
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Activate Virtual Environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

Configure `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ENGINE_URL=http://localhost:8000

# Optional — Google Calendar Integration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Run dev server:
```bash
npm run dev
```

### 4. Database Setup
Execute `supabase_schema.sql` inside your Supabase SQL Editor.

---

## 🧪 Verification & Testing

To run backend engine unit tests:
```bash
cd backend
pytest tests/ -v
```

---

## 📜 Copyright

Copyright © 2026 Ashraf. All Rights Reserved.
