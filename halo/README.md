# Halo - AI Wellness Coach

A schedule-aware AI wellness coach for busy people. Built with Next.js, FastAPI, and PostgreSQL.

## 🏗️ Architecture

- **Monorepo**: Turborepo + pnpm
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend**: FastAPI (Python) for AI/CV endpoints
- **Database**: PostgreSQL + Prisma
- **Auth**: NextAuth.js with Google OAuth

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Python 3.11+
- PostgreSQL (or use Docker)

### Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Set up environment variables**:
   ```bash
   cp infra/.env.example .env.local
   # Edit .env.local with your values
   ```

3. **Set up database**:
   ```bash
   # Using Docker
   docker-compose -f infra/docker-compose.yml up -d postgres

   # Or use your own PostgreSQL instance
   # Update DATABASE_URL in .env.local
   ```

4. **Run Prisma migrations**:
   ```bash
   cd apps/web
   pnpm prisma generate
   pnpm prisma migrate dev
   pnpm prisma db seed
   ```

5. **Start development servers**:
   ```bash
   # From root
   pnpm dev
   ```

   This will start:
   - Next.js web app: http://localhost:3000
   - FastAPI backend: http://localhost:8000

### Individual Commands

```bash
# Web app only
pnpm --filter web dev

# API only
cd apps/api
uvicorn main:app --reload

# Run migrations
pnpm --filter web prisma migrate dev

# Generate Prisma client
pnpm --filter web prisma generate
```

## 📁 Project Structure

```
.
├── apps/
│   ├── web/              # Next.js app
│   │   ├── src/
│   │   │   ├── app/      # App Router pages
│   │   │   ├── lib/      # Utilities
│   │   │   └── components/
│   │   └── prisma/       # Database schema
│   └── api/              # FastAPI service
│       ├── routers/      # API routes
│       └── services/     # Business logic
├── packages/
│   ├── ui/               # Shared UI components
│   └── types/            # Shared TypeScript types
└── infra/                # Docker, env examples
```

## 🔑 Features

- ✅ Dynamic onboarding survey
- ✅ Home dashboard with AI recommendations
- ✅ Weekly planner
- ✅ AI chat with action cards
- ✅ Meal logging with photo upload
- ✅ MyRec class finder
- ✅ Google Calendar integration
- ✅ User profile and settings

## 🧪 Development

### Adding a new page

1. Create a new file in `apps/web/src/app/[route]/page.tsx`
2. Use components from `@halo/ui`
3. Add API routes in `apps/web/src/app/api/`

### Adding a new API endpoint

1. Create a router in `apps/api/routers/`
2. Add service logic in `apps/api/services/`
3. Register router in `apps/api/main.py`

## 📝 Environment Variables

See `infra/.env.example` for all required variables.

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Secret for NextAuth (generate with `openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Google OAuth credentials

## 🐳 Docker

```bash
# Start PostgreSQL
docker-compose -f infra/docker-compose.yml up -d postgres

# Build and run API
docker-compose -f infra/docker-compose.yml up api
```

## 📚 API Documentation

FastAPI automatically generates OpenAPI docs:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🧩 Stubs & TODOs

The MVP includes stubs for:
- LLM provider (rule-based responses)
- Calorie estimation (simple heuristics)
- MyRec integration (mock data)
- Google Calendar (stub implementation)

Replace these with real implementations as needed.

## 📄 License

MIT

