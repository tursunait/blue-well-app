# 🚀 Halo Quick Start

## What Was Built

A complete **production-grade MVP** of Halo - a schedule-aware AI wellness coach with:

- ✅ Full-stack monorepo (Next.js + FastAPI)
- ✅ All 8 core pages implemented
- ✅ Google OAuth authentication
- ✅ Database schema with Prisma
- ✅ AI chat with action cards
- ✅ Meal photo logging
- ✅ Calendar integration hooks
- ✅ Responsive UI with design system

## 🏃 Run It Now

### 1. Install Dependencies
```bash
cd /Users/tusunaiturumbekova/halo
pnpm install
```

### 2. Set Up Environment
```bash
# Copy env template
cp infra/.env.example .env.local

# Generate NextAuth secret
openssl rand -base64 32
# Add this to .env.local as NEXTAUTH_SECRET

# Add Google OAuth credentials (get from Google Cloud Console)
# Add DATABASE_URL (use Docker or your PostgreSQL)
```

### 3. Start Database
```bash
# Using Docker
docker-compose -f infra/docker-compose.yml up -d postgres

# Or use your own PostgreSQL and update DATABASE_URL
```

### 4. Run Migrations
```bash
cd apps/web
pnpm prisma generate
pnpm prisma migrate dev --name init
```

### 5. Start Servers

**Option A: Both together (if turbo configured)**
```bash
# From root
pnpm dev
```

**Option B: Separately**
```bash
# Terminal 1: Web app
pnpm dev:web
# → http://localhost:3000

# Terminal 2: API
pnpm dev:api
# → http://localhost:8000
```

## 🎯 Test It

1. Open http://localhost:3000
2. Click "Sign in with Google" (you'll need OAuth credentials)
3. Complete onboarding survey
4. Explore home dashboard
5. Try chat: "daily plan" or "suggest a workout"
6. Log a meal: upload a photo
7. Check profile settings

## 📋 URLs

- **Web App**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Prisma Studio**: `cd apps/web && pnpm prisma studio`

## 🔑 Required Setup

### Google OAuth
1. Go to https://console.cloud.google.com/
2. Create project → Enable Google+ API & Calendar API
3. Create OAuth 2.0 credentials
4. Add redirect: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID & Secret to `.env.local`

### Database
- Use Docker: `docker-compose -f infra/docker-compose.yml up -d postgres`
- Or your own PostgreSQL instance
- Update `DATABASE_URL` in `.env.local`

## 📁 Project Location

All files are in: `/Users/tusunaiturumbekova/halo/`

## 🐛 Troubleshooting

**Port in use?**
- Change ports in `.env.local` and `apps/api/main.py`

**Database connection error?**
- Check PostgreSQL is running: `docker ps`
- Verify `DATABASE_URL` in `.env.local`

**Prisma errors?**
```bash
cd apps/web
pnpm prisma generate
pnpm prisma migrate reset  # WARNING: deletes data
```

## 📚 Documentation

- `README.md` - Full project overview
- `SETUP.md` - Detailed setup guide
- `IMPLEMENTATION_SUMMARY.md` - What was built

## ✨ Features Ready to Use

- ✅ Dynamic onboarding (one question at a time)
- ✅ Home dashboard with AI recommendations
- ✅ Chat with AI coach (returns action cards)
- ✅ Meal photo logging (estimates calories)
- ✅ Weekly planner view
- ✅ Profile with Google Calendar toggle
- ✅ All UI components styled with design tokens

## 🎨 Design System

All components use the design tokens:
- Colors: Teal (#3BA5A5), Blue (#5C87D6), Green (#74C69D)
- Typography: Inter font
- Spacing: Consistent Tailwind scale
- Components: shadcn/ui based

---

**Ready to go!** 🎉 Start the servers and begin testing.

