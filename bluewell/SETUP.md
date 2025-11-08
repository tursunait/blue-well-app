# Halo Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Install all dependencies
pnpm install
```

### 2. Set Up Environment Variables

```bash
# Copy the example env file
cp infra/.env.example .env.local

# Edit .env.local and add your values:
# - Generate NEXTAUTH_SECRET: openssl rand -base64 32
# - Add Google OAuth credentials from Google Cloud Console
# - Set DATABASE_URL (use Docker or your own PostgreSQL)
```

### 3. Set Up Database

**Option A: Using Docker (Recommended for development)**

```bash
# Start PostgreSQL
docker-compose -f infra/docker-compose.yml up -d postgres

# The DATABASE_URL in .env.local should be:
# DATABASE_URL=postgresql://halo:halo123@localhost:5432/halo?schema=public
```

**Option B: Using Your Own PostgreSQL**

1. Create a database named `halo`
2. Update `DATABASE_URL` in `.env.local`

### 4. Run Database Migrations

```bash
cd apps/web
pnpm prisma generate
pnpm prisma migrate dev --name init
pnpm prisma db seed
```

### 5. Start Development Servers

**From the root directory:**

```bash
# This will start both web and API (if you set up turbo)
pnpm dev
```

**Or start them separately:**

```bash
# Terminal 1: Next.js web app
cd apps/web
pnpm dev
# → http://localhost:3000

# Terminal 2: FastAPI backend
cd apps/api
python -m uvicorn main:app --reload
# → http://localhost:8000
```

## 📋 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API and Google Calendar API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env.local`

## 🧪 Test the Application

1. Open http://localhost:3000
2. Click "Sign in with Google"
3. Complete onboarding survey
4. Explore the home dashboard
5. Try the chat feature
6. Log a meal with photo upload

## 📝 API Documentation

Once the FastAPI server is running:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps

# Check database connection
psql postgresql://halo:halo123@localhost:5432/halo
```

### Port Already in Use

```bash
# Change ports in:
# - apps/web/package.json (dev script)
# - apps/api/main.py (uvicorn port)
# - .env.local (NEXTAUTH_URL, FASTAPI_BASE_URL)
```

### Prisma Issues

```bash
# Reset database (WARNING: deletes all data)
cd apps/web
pnpm prisma migrate reset

# Regenerate Prisma client
pnpm prisma generate
```

## 📦 Project Structure

```
halo/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # FastAPI backend
├── packages/
│   ├── ui/           # Shared UI components
│   └── types/        # Shared TypeScript types
└── infra/            # Docker, env configs
```

## 🎯 Next Steps

1. Replace AI stubs with real implementations
2. Add real MyRec API integration
3. Implement proper Google Calendar sync
4. Add image upload to S3
5. Deploy to production

## 📚 Additional Resources

- [Next.js Docs](https://nextjs.org/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js Docs](https://next-auth.js.org/)

