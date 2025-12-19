# BlueWell - AI-Powered Wellness Coach

BlueWell is an intelligent wellness coaching application that provides personalized meal plans, workout recommendations, and activity tracking. The app uses OpenAI's GPT-4o-mini with function calling to generate contextual recommendations based on user fitness goals, dietary preferences, and schedule.

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes + FastAPI (Python)
- **Database**: PostgreSQL with Prisma ORM  
- **AI**: OpenAI GPT-4o-mini (plan generation) + Embeddings (semantic search)
- **Auth**: NextAuth.js with Google OAuth
- **Build**: pnpm workspaces with Turborepo

## 📦 Project Structure

```
blue-well-app/
├── apps/
│   ├── web/                    # Next.js full-stack application
│   │   ├── src/app/            # App Router pages and API routes
│   │   ├── src/ai/             # AI planning logic (OpenAI integration)
│   │   ├── src/lib/            # Utilities (auth, API, database)
│   │   └── prisma/             # Database schema & migrations
│   └── api/                    # FastAPI service (Python)
├── packages/
│   ├── ui/                     # Shared React UI components
│   └── types/                  # Shared TypeScript types
└── infra/
    └── docker-compose.yml      # PostgreSQL container
```

## 🎯 Key Features

### AI-Powered Plan Generation
- **OpenAI GPT-4o-mini with Function Calling**: Generates personalized daily and weekly plans
- **Context-Aware Recommendations**: Considers fitness goals, dietary preferences, schedule constraints
- **Function Tools**: 
  - `search_menu` - Semantic search for meals matching diet preferences
  - `list_rec_classes` - Fitness class recommendations
  - `compose_timeline` - Schedule items in user's free time slots

### Intelligent Features
- **Multi-Step Onboarding Survey**: Collects personal info, fitness goals, schedule, dietary preferences
- **Semantic Menu Search**: Uses embeddings to find relevant meals by meaning, not just keywords
- **Calorie Goal Calculation**: BMR → TDEE → goal-adjusted budget (lose fat: -250 cal, gain muscle: +200 cal)
- **Activity Tracking**: Log meals and workouts with automatic macro tracking
- **Daily Progress Stats**: Monitor calories, protein, steps toward daily goals

### Data Integration
- **Duke Dining Menu Import**: Imports nutrition data and generates embeddings
- **Duke Rec Class Sync**: Syncs fitness classes from campus recreation
- **Photo Analysis**: Estimates calories from meal photos (FastAPI backend)

## 🔑 Core System Flows

### Daily Plan Generation
1. User visits `/plan`
2. API checks for cached plan or generates new one
3. AI Planner retrieves user context (goals, calorie budget, today's consumption)
4. Calls OpenAI with function tools to generate meals, workouts, tips
5. Plan cached in database for the day
6. Frontend renders with meal cards, class suggestions, wellness tips

### Meal Logging Flow
- **Manual Entry**: User enters meal name, calories, and macros
- **Menu Selection**: Pick from pre-loaded dining menu with embeddings
- **Photo Upload**: FastAPI endpoint analyzes image for calorie estimation
- All data aggregated for daily stats calculation

### Semantic Search
- Menu items indexed with OpenAI embeddings (`text-embedding-3-small`)
- User queries converted to embeddings and ranked by:
  1. Diet preference compliance (vegetarian, vegan, etc.)
  2. Semantic similarity to query
  3. Protein content alignment with fitness goals
  4. Price considerations

## 🏛️ Architecture Overview

BlueWell is a full-stack monorepo that demonstrates an AI-driven wellness coach: personalized meal plans, activity suggestions, dining-menu semantic search, calorie/photo analysis, and a simple onboarding survey.


**What the repo contains:**
- **Frontend (`apps/web`)**: Next.js 14 (App Router) + TypeScript + Tailwind. UI, onboarding flow, plan pages, and API routes for auth and data.
- **Backend (Next.js API + FastAPI)**: Next.js API routes with server endpoints; Python FastAPI services live in `apps/api` (chat/calendar) and `apps/calorie-estimator-api` (image/text calorie estimates).
- **Shared packages**: `packages/ui` (component primitives), `packages/types` (shared TypeScript types).
- **Data & ETL**: `scripts/import-dining.sh` and ETL code import campus dining menus into the app DB and generate embeddings.

**Core features:**
- AI plan generation using OpenAI (chat + function calling).
- Semantic menu search via OpenAI embeddings.
- Photo and text calorie estimation (FastAPI service in `apps/calorie-estimator-api`).
- Onboarding survey and per-day cached plans.

**Quick local reproduction (development)**

Prerequisites:
- Node.js (18+), `pnpm` (for workspace), and `python3` (3.9+ recommended).
- An OpenAI API key for AI features (set `OPENAI_API_KEY`).

1) Install JS dependencies (repo root):

```bash
pnpm install
```

2) Configure the web app environment:

- Copy or create `apps/web/.env.local` with at least:
  - `DATABASE_URL=file:./prisma/prisma/dev.db` (local SQLite for demos)
  - `SKIP_AUTH=true` (optional, enables demo auth bypass)
  - `OPENAI_API_KEY=your_key_here`
  - `NEXT_PUBLIC_FASTAPI_BASE_URL=http://localhost:8000` (or `http://localhost:8001` for the calorie estimator)

3) Initialize Prisma (from `apps/web`):

```bash
cd apps/web
npx prisma db push
npx prisma generate
```

4) Start the Next.js web app (from repo root):

```bash
pnpm --filter web dev
```

5) Start the Python FastAPI services:

- Chat/calendar API (if present in `apps/api`):

```bash
cd apps/api
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --app-dir apps/api --reload --port 8000
```

- Calorie Estimator (in `apps/calorie-estimator-api`):

```bash
cd apps/calorie-estimator-api
./setup.sh    # creates venv and installs requirements (or run manually)
. venv/bin/activate
uvicorn app.main:app --app-dir . --reload --port 8001
```

6) (Optional) Import Duke Dining menus for demo data:

```bash
# from repo root
scripts/import-dining.sh
```

Notes: the script generates an `ADMIN_TOKEN` and posts to the running web dev server to import sample menu items and embeddings.

**Prisma & DB**
- The demo environment uses SQLite at `apps/web/prisma/prisma/dev.db` to keep local setup simple. If you want `Json` columns or production parity, switch to PostgreSQL and run migrations.

**Calorie estimator**
- The calorie estimator exposes:
  - `GET /health` — health check
  - `POST /v1/estimate-calories-text` — estimate from text (`form: food_description`)
  - `POST /v1/estimate-calories` — multipart image upload
- Ensure `OPENAI_API_KEY` and `OPENAI_MODEL` (optional) are set in `apps/calorie-estimator-api/.env`.

**Developer tips & known quirks**
- The app currently uses SQLite locally — Prisma `Json` type is not supported with SQLite; answers that need JSON are stored as strings. See `apps/web/src/app/api/survey/answer/route.ts` for serialization.
- If ports conflict (8000/8001), kill the process or change the port when starting `uvicorn`.
- To rebuild embeddings for imported menu items, re-run the import script with `rebuildEmbeddings=true`.

**Useful commands**
- Build monorepo: `pnpm build`
- Start web only: `pnpm --filter web dev`
- Prisma DB push & generate: `cd apps/web && npx prisma db push && npx prisma generate`
- Start calorie estimator (example):

```bash
cd apps/calorie-estimator-api
./setup.sh
uvicorn app.main:app --app-dir . --reload --port 8001
```
---

Maintained as a demo/portfolio repository — adapt production details (DB, secrets, and deployment) before going live.
