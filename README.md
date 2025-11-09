# BlueWell - AI-Powered Wellness Coach

BlueWell is an intelligent wellness coaching application designed for busy students, particularly at Duke University. It provides personalized meal plans, workout recommendations, and activity tracking based on user onboarding data, dietary preferences, and fitness goals.

## 🏗️ Architecture Overview

BlueWell is built as a **monorepo** using modern web technologies:

- **Frontend**: Next.js 14 (App Router) with TypeScript, Tailwind CSS, and shadcn/ui components
- **Backend**: Next.js API Routes for business logic + FastAPI (Python) for AI/CV endpoints
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI GPT-4o-mini for plan generation and embeddings for semantic search
- **Authentication**: NextAuth.js with Google OAuth (with dev mode bypass)
- **Package Management**: pnpm workspaces with Turborepo for build orchestration

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface (Browser)                  │
│  Next.js App Router: /home, /plan, /log, /onboarding, etc.  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Routes (/api/*)                     │
│  - /api/survey/submit    - Save onboarding answers          │
│  - /api/plan/today       - Get daily AI-generated plan      │
│  - /api/plan/weekly      - Get weekly meal/workout plan      │
│  - /api/log/meal         - Log meals                        │
│  - /api/stats/today      - Get daily progress stats          │
│  - /api/menu/search      - Search menu items                 │
│  - /api/rec/classes      - Get fitness classes              │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌──────────────────┐        ┌──────────────────┐
│   PostgreSQL      │        │   FastAPI        │
│   (Prisma ORM)    │        │   (AI/CV)        │
│                   │        │   - Photo        │
│   - User data     │        │     analysis     │
│   - Food logs     │        │   - Calorie      │
│   - Plans         │        │     estimation   │
│   - Menu items    │        │                  │
└──────────────────┘        └──────────────────┘
        │
        ▼
┌──────────────────┐
│   OpenAI API      │
│   - GPT-4o-mini   │
│   - Embeddings    │
└──────────────────┘
```

## 📦 Project Structure

```
blue-well-app/
├── apps/
│   ├── web/                          # Next.js application
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages and API routes
│   │   │   │   ├── onboarding/       # Onboarding survey page
│   │   │   │   ├── home/             # Dashboard with recommendations
│   │   │   │   ├── plan/             # Daily/weekly plan view
│   │   │   │   ├── log/              # Meal/activity logging
│   │   │   │   ├── profile/          # User profile settings
│   │   │   │   └── api/              # API route handlers
│   │   │   │       ├── survey/       # Survey submission
│   │   │   │       ├── plan/         # Plan generation (today/weekly/next6h)
│   │   │   │       ├── log/          # Meal/activity logging
│   │   │   │       ├── stats/        # Daily statistics
│   │   │   │       ├── menu/         # Menu search
│   │   │   │       ├── rec/         # Fitness class recommendations
│   │   │   │       └── admin/        # Admin endpoints (ETL)
│   │   │   ├── ai/                   # AI planning logic
│   │   │   │   ├── planner.ts        # Main AI planner (OpenAI)
│   │   │   │   ├── planner-tools.ts  # Helper functions for planner
│   │   │   │   └── embeddings.ts    # OpenAI embeddings for menu search
│   │   │   ├── etl/                  # Data import/export
│   │   │   │   ├── dukeDiningExcel.ts # Import Duke Dining menu from Excel
│   │   │   │   └── dukeRec.ts        # Sync Duke Rec fitness classes
│   │   │   ├── lib/                  # Utilities
│   │   │   │   ├── prisma.ts         # Prisma client
│   │   │   │   ├── auth-dev.ts       # Dev mode auth bypass
│   │   │   │   └── api.ts            # API client functions
│   │   │   └── components/           # Page-specific components
│   │   └── prisma/
│   │       └── schema.prisma        # Database schema
│   └── api/                          # FastAPI service (Python)
│       ├── routers/                  # API endpoints
│       │   ├── chat.py               # AI chat endpoint
│       │   ├── calorie.py           # Photo calorie estimation
│       │   ├── myrec.py              # MyRec class finder
│       │   └── calendar.py           # Google Calendar integration
│       └── services/                 # Business logic
│           ├── llm.py                 # LLM provider (stub)
│           ├── calorie.py           # Calorie estimator
│           └── myrec_provider.py     # MyRec provider (stub)
├── packages/
│   ├── ui/                           # Shared UI component library
│   │   └── src/components/          # Reusable React components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── question-card.tsx    # Survey question renderer
│   │       ├── daily-goal-progress.tsx
│   │       └── ...
│   └── types/                        # Shared TypeScript types
└── infra/
    ├── docker-compose.yml            # PostgreSQL container
    └── Dockerfile.api                # FastAPI container
```

## 🔑 Core Components Explained

### 1. **Onboarding System** (`apps/web/src/app/onboarding/page.tsx`)

The onboarding flow collects user information through a dynamic, one-question-at-a-time survey.

**Question Types:**
- **Compound**: Multi-field form (age, gender, height, weight, food preferences)
- **Select**: Single choice from options
- **Multi**: Multiple selections (wellness goals)
- **Slider**: Numeric input with labels (schedule consistency, meal regularity)
- **Fitness Preferences**: Custom component for workout preferences (weekly target, preferred times, sports/classes)

**How it works:**
1. User answers questions one at a time
2. Answers are stored in React state
3. On completion, all answers are sent to `/api/survey/submit`
4. Backend calculates:
   - **BMR** (Basal Metabolic Rate) using Mifflin-St Jeor formula
   - **TDEE** (Total Daily Energy Expenditure) based on activity level
   - **Calorie budget** adjusted by fitness goal (LOSE_FAT: -250, GAIN_MUSCLE: +200)
   - **Protein target** (1.2g per kg body weight)
   - **Step goal** (default: 10,000 steps)

**Key Files:**
- `apps/web/src/app/onboarding/page.tsx` - Main onboarding page
- `packages/ui/src/components/question-card.tsx` - Question renderer
- `apps/web/src/app/api/survey/submit/route.ts` - Submission handler

### 2. **AI Planner** (`apps/web/src/ai/planner.ts`)

The AI Planner generates personalized daily and weekly plans using OpenAI's GPT-4o-mini with function calling.

**How it works:**
1. **User Context Retrieval** (`getUserContext`):
   - Fetches user profile from database
   - Calculates calorie budget and protein target
   - Gets dietary preferences and restrictions
   - Retrieves today's consumed calories/protein from food logs

2. **Plan Generation**:
   - Constructs a detailed prompt with user context
   - Calls OpenAI with function calling tools:
     - `search_menu`: Find menu items matching diet preferences
     - `list_rec_classes`: Get available fitness classes
     - `compose_timeline`: Schedule items in free time windows
   - AI returns a structured `RecommendationDTO` with:
     - Meal recommendations (breakfast, lunch, dinner)
     - Workout suggestions (Duke Rec classes or generic)
     - Nudges (reminders/habits)
     - Rationale (explanation of the plan)

3. **Plan Storage**:
   - Saves plan to `Recommendation` table in database
   - Plans are cached (one per day for "TODAY" scope)

**Key Files:**
- `apps/web/src/ai/planner.ts` - Main planner logic
- `apps/web/src/ai/planner-tools.ts` - Helper functions
- `apps/web/src/app/api/plan/today/route.ts` - API endpoint

### 3. **Menu Search System** (`apps/web/src/ai/embeddings.ts`)

Semantic search for menu items using OpenAI embeddings.

**How it works:**
1. **Embedding Generation**:
   - When menu items are imported, generate embeddings using `text-embedding-3-small`
   - Store embeddings as binary data in `MenuItem.embedding` field

2. **Search Process**:
   - User query is converted to an embedding
   - Cosine similarity is calculated between query and all menu item embeddings
   - Results are ranked by:
     1. Diet preference compliance (vegetarian, vegan, etc.)
     2. Semantic similarity (cosine similarity)
     3. Protein content (if goal requires high protein)
     4. Price (if budget constraint)
   - Top 10 results are returned

**Key Files:**
- `apps/web/src/ai/embeddings.ts` - Embedding generation and search
- `apps/web/src/app/api/menu/search/route.ts` - Search API endpoint

### 4. **ETL (Extract, Transform, Load) System**

#### Duke Dining Import (`apps/web/src/etl/dukeDiningExcel.ts`)

Imports menu items from Excel file (`data/Data.xlsx`).

**How it works:**
1. Reads Excel file using SheetJS (`xlsx` library)
2. Parses multiple sheets (one per vendor/location)
3. Normalizes column names (handles synonyms like "Vendor"/"Restaurant")
4. Extracts nutrition data (calories, protein, carbs, fat)
5. Normalizes item names (lowercase, remove punctuation) for deduplication
6. Upserts vendors and menu items to database
7. Generates embeddings for new/updated items

**Usage:**

First, set `ADMIN_TOKEN` in `apps/web/.env.local`:
```bash
ADMIN_TOKEN=your-secure-token-here
```

Then use it in the curl command:
```bash
curl -X POST http://localhost:3000/api/admin/duke-dining/import \
  -H "ADMIN_TOKEN: your-secure-token-here" \
  -H "Content-Type: application/json" \
  -d '{"rebuildEmbeddings": false}'
```

**Note:** Replace `your-secure-token-here` with the actual value from your `.env.local` file. You can generate a secure token with:
```bash
openssl rand -base64 32
```

#### Duke Rec Sync (`apps/web/src/etl/dukeRec.ts`)

Syncs fitness classes from Duke Rec MyRec portal.

**How it works:**
1. Tries multiple iCal feed URLs (if `DUKE_REC_FEED_URL` is set)
2. Falls back to web scraping common API endpoints
3. Parses iCal or JSON responses
4. Infers intensity from class title (yoga=low, HIIT=high)
5. Upserts classes to database

**Usage:**

Use the same `ADMIN_TOKEN` from your `.env.local`:
```bash
curl -X POST http://localhost:3000/api/admin/duke-rec/sync \
  -H "ADMIN_TOKEN: your-secure-token-here" \
  -H "Content-Type: application/json" \
  -d '{"daysAhead": 7}'
```

**Key Files:**
- `apps/web/src/etl/dukeDiningExcel.ts` - Excel import
- `apps/web/src/etl/dukeRec.ts` - Class sync
- `apps/web/src/app/api/admin/duke-dining/import/route.ts` - Admin endpoint
- `apps/web/src/app/api/admin/duke-rec/sync/route.ts` - Admin endpoint

### 5. **Logging System**

Tracks meals and activities throughout the day.

**Meal Logging** (`apps/web/src/app/api/log/meal/route.ts`):
- Manual entry: User enters item name, calories, macros
- Photo upload: Uses FastAPI `/calorie/estimate` endpoint (stub)
- Menu pick: Selects from search results

**Activity Logging** (`apps/web/src/app/api/log/activity/route.ts`):
- Logs workouts, walks, etc.
- Estimates calories burned using MET (Metabolic Equivalent of Task) lookup table
- Formula: `kcalBurn = MET × weightKg × durationHours`

**Stats Calculation** (`apps/web/src/app/api/stats/today/route.ts`):
- Aggregates all food logs for today
- Calculates remaining calories based on goal
- Tracks steps (starts at 0, goal 10,000)
- Tracks protein consumption

**Key Files:**
- `apps/web/src/app/api/log/meal/route.ts` - Meal logging
- `apps/web/src/app/api/log/photo/route.ts` - Photo analysis
- `apps/web/src/app/api/log/activity/route.ts` - Activity logging
- `apps/web/src/app/api/stats/today/route.ts` - Daily stats

### 6. **Database Schema** (`apps/web/prisma/schema.prisma`)

**Core Models:**

- **User**: Main user table with profile data (age, height, weight, fitness goal, dietary preferences)
- **SurveyAnswer**: Individual survey question answers (JSON format)
- **FoodLog**: Meal entries with nutrition data
- **ActivityLog**: Workout/activity entries
- **MenuItem**: Duke Dining menu items with embeddings
- **MenuVendor**: Dining locations (Wilson, Brodie, etc.)
- **FitnessClass**: Duke Rec classes (title, time, location, intensity)
- **Recommendation**: AI-generated plans (TODAY, NEXT_6_HOURS, WEEK scope)

**Relationships:**
- User → SurveyAnswer (one-to-many)
- User → FoodLog (one-to-many)
- User → ActivityLog (one-to-many)
- User → Recommendation (one-to-many)
- MenuVendor → MenuItem (one-to-many)

### 7. **Authentication** (`apps/web/src/lib/auth-dev.ts`)

**Production Mode:**
- Uses NextAuth.js with Google OAuth
- Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

**Development Mode:**
- Set `SKIP_AUTH=true` in `.env.local`
- Automatically creates/uses test user (`test@halo.com`)
- Bypasses OAuth for faster development

**Key Files:**
- `apps/web/src/lib/auth-dev.ts` - Dev mode helpers
- `apps/web/src/app/api/auth/[...nextauth]/route.ts` - NextAuth config

## 🚀 Setup & Installation

### Prerequisites

- **Node.js** 18+ and **pnpm** 8+
- **Python** 3.11+ (for FastAPI)
- **PostgreSQL** 15+ (or use Docker)
- **Docker** (optional, for database)
- **OpenAI API Key** (required for AI features)

### Step-by-Step Setup

#### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd blue-well-app

# Install all dependencies (root + all packages)
pnpm install
```

#### 2. Set Up Environment Variables

Create `apps/web/.env.local`:

```bash
# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here-generate-with-openssl-rand-base64-32
SKIP_AUTH=true  # Set to false for production

# Google OAuth (optional if SKIP_AUTH=true)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Database
DATABASE_URL=postgresql://halo:halo123@localhost:5432/halo?schema=public

# OpenAI (REQUIRED for AI features)
OPENAI_API_KEY=sk-proj-...your-key-here

# Optional: Planner Configuration
PLANNER_CHAT_MODEL=gpt-4o-mini
PLANNER_EMBEDDINGS_MODEL=text-embedding-3-small

# Optional: Admin Token (for ETL endpoints)
ADMIN_TOKEN=your-admin-token-here

# Optional: Duke Rec Feed URL (iCal format)
DUKE_REC_FEED_URL=https://myrec.recreation.duke.edu/calendar/feed.ics

# Optional: Defaults
DEFAULT_STEP_GOAL=10000
DEFAULT_PROTEIN_PER_KG=1.2

# FastAPI (for photo analysis)
NEXT_PUBLIC_FASTAPI_BASE_URL=http://localhost:8000
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

#### 3. Start PostgreSQL Database

**Option A: Using Docker (Recommended)**

```bash
# Start PostgreSQL container
docker compose -f infra/docker-compose.yml up -d postgres

# Verify it's running
docker compose -f infra/docker-compose.yml ps postgres
```

**Option B: Local PostgreSQL**

1. Install PostgreSQL locally
2. Create database: `createdb halo`
3. Update `DATABASE_URL` in `.env.local`

#### 4. Set Up Database Schema

```bash
# Generate Prisma client
pnpm prisma:generate

# Run migrations (creates tables)
pnpm prisma:migrate

# Seed database with test data (optional)
pnpm prisma:seed
```

#### 5. Start Development Servers

**Option A: Start Everything (Recommended)**

```bash
# From root directory
pnpm dev
```

This starts:
- Next.js web app: http://localhost:3000
- FastAPI backend: http://localhost:8000

**Option B: Start Individually**

```bash
# Terminal 1: Next.js
pnpm dev:web

# Terminal 2: FastAPI
pnpm dev:api
```

#### 6. Import Initial Data (Optional)

**Important:** Before running these commands, make sure you've set `ADMIN_TOKEN` in `apps/web/.env.local`. If you haven't set it yet, generate one:

```bash
# Generate a secure admin token
openssl rand -base64 32

# Add it to apps/web/.env.local:
# ADMIN_TOKEN=generated-token-here
```

**Import Duke Dining Menu:**
```bash
# Replace 'your-admin-token' with the actual value from .env.local
curl -X POST http://localhost:3000/api/admin/duke-dining/import \
  -H "ADMIN_TOKEN: your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"rebuildEmbeddings": true}'
```

**Sync Duke Rec Classes:**
```bash
# Replace 'your-admin-token' with the actual value from .env.local
curl -X POST http://localhost:3000/api/admin/duke-rec/sync \
  -H "ADMIN_TOKEN: your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"daysAhead": 7}'
```

**Note:** If you get "Unauthorized" errors, check that:
1. `ADMIN_TOKEN` is set in `apps/web/.env.local`
2. The token in the curl command matches the one in `.env.local`
3. You've restarted the Next.js dev server after adding/updating `ADMIN_TOKEN`

## 📱 Application Flow

### User Journey

1. **Welcome** (`/welcome`) → Landing page
2. **Onboarding** (`/onboarding`) → Complete survey
   - Personal info (age, height, weight, gender)
   - Wellness goals (multi-select)
   - Activity level
   - Fitness preferences
   - Schedule consistency
   - Time budget
   - Meal regularity
   - Dietary preferences
   - Foods to avoid (optional)
3. **Home** (`/home`) → Dashboard
   - Daily progress (calories, steps, protein)
   - Weekly meal plan preview
   - Weekly workout plan preview
   - AI recommendations (meals, classes)
4. **Plan** (`/plan`) → Detailed daily plan
   - Today's calorie/protein targets
   - Meal recommendations with times
   - Workout suggestions
   - Goal achievement tips
5. **Log** (`/log`) → Track meals and activities
   - Photo upload for meal detection
   - Manual meal entry
   - Activity logging
6. **Profile** (`/profile`) → Settings and integrations

### Data Flow Example: Generating a Daily Plan

```
1. User visits /plan
   ↓
2. Frontend calls GET /api/plan/today
   ↓
3. API route checks authentication (getUserId)
   ↓
4. Checks if user completed onboarding
   ↓
5. Checks for existing plan in database (Recommendation table)
   ↓
6. If no plan exists, calls generatePlanForWindow()
   ↓
7. AI Planner:
   a. Gets user context (getUserContext)
      - Fetches user profile
      - Calculates calorie budget (BMR → TDEE → goal adjustment)
      - Gets today's consumed calories from FoodLog
   b. Constructs prompt with user data
   c. Calls OpenAI with function calling tools
   d. AI uses tools:
      - search_menu: Finds meals matching diet preferences
      - list_rec_classes: Gets available fitness classes
      - compose_timeline: Schedules items
   e. Returns RecommendationDTO
   ↓
8. Plan is saved to database (Recommendation table)
   ↓
9. Plan is returned to frontend
   ↓
10. Frontend renders plan with meal cards, workout suggestions, tips
```

## 🔧 Common Commands

```bash
# Development
pnpm dev                    # Start all services
pnpm dev:web                # Start Next.js only
pnpm dev:api                # Start FastAPI only

# Database
pnpm prisma:generate        # Generate Prisma client
pnpm prisma:migrate         # Run migrations
pnpm prisma:seed            # Seed database

# Build
pnpm build                  # Build all packages
pnpm lint                   # Lint code
pnpm typecheck              # Type check

# Setup (first time)
pnpm setup                  # Install + generate + migrate
```

## 🐛 Troubleshooting

### Database Connection Error

**Error:** `Can't reach database server at localhost:5432`

**Solution:**
```bash
# Check if PostgreSQL is running
docker compose -f infra/docker-compose.yml ps postgres

# Start PostgreSQL if not running
docker compose -f infra/docker-compose.yml up -d postgres

# Wait a few seconds, then restart Next.js
```

### "Unauthorized" Error on Plan Page

**Error:** `Unauthorized` when accessing `/plan`

**Solution:**
1. Check `SKIP_AUTH=true` in `apps/web/.env.local`
2. Restart Next.js dev server
3. If still failing, check database connection (test user creation)

### OpenAI API Errors

**Error:** `Invalid OpenAI API key` or `Rate limit exceeded`

**Solution:**
1. Verify `OPENAI_API_KEY` in `apps/web/.env.local` (no quotes needed)
2. Check API key is valid at https://platform.openai.com/api-keys
3. Verify you have credits/quota
4. Check key starts with `sk-proj-` or `sk-`

### Plan Generation Fails

**Error:** `Failed to load today's plan`

**Possible Causes:**
1. User hasn't completed onboarding (missing age, height, weight, fitness goal)
2. OpenAI API key not set or invalid
3. Database connection issue

**Solution:**
1. Complete onboarding at `/onboarding`
2. Check OpenAI API key
3. Check server logs for detailed error

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill it
kill -9 $(lsof -ti:3000)

# Or use a different port
PORT=3001 pnpm dev:web
```

## 📚 API Reference

### Next.js API Routes

**Authentication Required** (unless `SKIP_AUTH=true`)

#### Survey
- `POST /api/survey/submit` - Submit onboarding answers
  - Body: `{ age, gender, heightCm, weightKg, fitnessGoal, ... }`
  - Returns: `{ calorieBudget, proteinTarget, stepGoal }`

#### Plans
- `GET /api/plan/today` - Get today's plan
  - Returns: `RecommendationDTO` with meals, workouts, tips
- `GET /api/plan/weekly` - Get weekly plan
  - Returns: `{ meals: {...}, workouts: {...}, tips: [...] }`
- `GET /api/plan/next6h` - Get next 6-hour plan

#### Logging
- `POST /api/log/meal` - Log a meal
  - Body: `{ itemName, calories, proteinG, carbsG, fatG, source }`
- `POST /api/log/photo` - Analyze photo and log meal
  - Body: `{ image: base64 }`
- `POST /api/log/activity` - Log an activity
  - Body: `{ activity, durationMin, intensity }`

#### Stats
- `GET /api/stats/today` - Get today's progress
  - Returns: `{ calories: {...}, protein: {...}, steps: {...} }`

#### Menu
- `GET /api/menu/search?q=...&dietPrefs[]=...` - Search menu items

#### Classes
- `GET /api/rec/classes?from=...&to=...&intensity=...` - Get fitness classes

#### Admin (Requires ADMIN_TOKEN header)
- `POST /api/admin/duke-dining/import` - Import menu from Excel
- `POST /api/admin/duke-rec/sync` - Sync fitness classes

### FastAPI Endpoints

- `POST /chat` - AI chat endpoint
- `POST /calorie/estimate` - Estimate calories from photo
- `GET /myrec/classes` - Search MyRec classes
- `POST /calendar/add` - Add event to Google Calendar

**Docs:** http://localhost:8000/docs (Swagger UI)

## 🎯 Key Features

### ✅ Implemented

- [x] Dynamic onboarding survey with multiple question types
- [x] AI-powered daily plan generation (OpenAI GPT-4o-mini)
- [x] Weekly meal and workout plans
- [x] Semantic menu search with embeddings
- [x] Meal and activity logging
- [x] Daily progress tracking (calories, steps, protein)
- [x] Duke Dining menu import (Excel)
- [x] Duke Rec class sync (iCal/web scraping)
- [x] Goal-based calorie calculation (BMR → TDEE → adjustment)
- [x] Development mode authentication bypass

### 🚧 Stubs (Need Implementation)

- [ ] FastAPI photo analysis (currently returns mock data)
- [ ] Google Calendar integration (stub)
- [ ] MyRec API integration (currently web scraping)
- [ ] Cron jobs for automatic data sync

## 🔐 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/halo` |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI features | `sk-proj-...` |
| `NEXTAUTH_SECRET` | Yes | Secret for NextAuth.js | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Base URL of app | `http://localhost:3000` |
| `SKIP_AUTH` | No | Dev mode auth bypass | `true` or `false` |
| `GOOGLE_CLIENT_ID` | No* | Google OAuth client ID | Required if `SKIP_AUTH=false` |
| `GOOGLE_CLIENT_SECRET` | No* | Google OAuth client secret | Required if `SKIP_AUTH=false` |
| `PLANNER_CHAT_MODEL` | No | OpenAI model for planner | `gpt-4o-mini` (default) |
| `PLANNER_EMBEDDINGS_MODEL` | No | OpenAI embeddings model | `text-embedding-3-small` (default) |
| `ADMIN_TOKEN` | No | Token for admin endpoints | Any secure string |
| `DUKE_REC_FEED_URL` | No | iCal feed URL for Duke Rec | `https://...` |
| `DEFAULT_STEP_GOAL` | No | Default daily step goal | `10000` |
| `DEFAULT_PROTEIN_PER_KG` | No | Protein per kg body weight | `1.2` |
| `NEXT_PUBLIC_FASTAPI_BASE_URL` | No | FastAPI backend URL | `http://localhost:8000` |

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review server logs for detailed errors
3. Check environment variables are set correctly
4. Verify database is running and accessible

---

**Built with ❤️ for Duke students**
