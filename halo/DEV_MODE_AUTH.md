# Development Mode - Authentication Bypass

## Overview

The app now supports a **development mode** that bypasses Google OAuth authentication. This allows you to test and use the app without setting up Google OAuth credentials.

## How It Works

When `SKIP_AUTH=true` is set in `.env.local`, the app:
- Uses a mock test user (from the seeded database)
- Automatically signs you in when you visit the app
- Bypasses all authentication checks
- Uses the test user's ID for all API operations

## Setup

The dev mode is already enabled! Check your `.env.local` file:

```bash
SKIP_AUTH=true
NEXT_PUBLIC_SKIP_AUTH=true
```

## Usage

1. **Start the app** (if not already running):
   ```bash
   pnpm dev:web
   ```

2. **Visit** http://localhost:3000

3. **You'll be automatically signed in** and redirected to the onboarding page

4. **Use the app normally** - all features work without authentication!

## Test User

The app uses a test user with:
- Email: `test@halo.com`
- Name: `Test User`
- Pre-configured profile with sample data

All your actions (meals, survey answers, etc.) are saved under this test user.

## Disabling Dev Mode

To re-enable Google OAuth authentication:

1. Remove or set to `false` in `.env.local`:
   ```bash
   SKIP_AUTH=false
   NEXT_PUBLIC_SKIP_AUTH=false
   ```

2. Set up Google OAuth credentials (see `GOOGLE_OAUTH_SETUP.md`)

3. Restart the Next.js server

## Notes

- Dev mode is **only for development** - never use this in production!
- The test user is created automatically if it doesn't exist
- All data is saved to the database normally
- You can still test all features except Google Calendar integration (which requires real OAuth)

## Troubleshooting

**App still asks for sign-in?**
- Make sure `.env.local` has `SKIP_AUTH=true` and `NEXT_PUBLIC_SKIP_AUTH=true`
- Restart the Next.js server after changing `.env.local`

**Database errors?**
- Make sure PostgreSQL is running: `docker ps | grep postgres`
- Run migrations: `cd apps/web && pnpm prisma migrate dev`

**Test user not found?**
- Run the seed script: `cd apps/web && pnpm prisma db seed`

