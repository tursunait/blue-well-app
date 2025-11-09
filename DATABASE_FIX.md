# Database Configuration Error - Fix Guide

## Issue
You're seeing "Database configuration error" which means the Prisma client can't find the required models (`aIRec`, `user`).

## Root Cause
The `DATABASE_URL` in `.env.local` may have quotes around it, or the Prisma client needs to be regenerated.

## Quick Fix

### 1. Check DATABASE_URL Format

Your `.env.local` should have:
```bash
DATABASE_URL=file:./prisma/dev.db
```

**NOT:**
```bash
DATABASE_URL="file:/absolute/path"  # ❌ Quotes and absolute path can cause issues
```

### 2. Regenerate Prisma Client

```bash
cd apps/web
npx prisma generate
```

### 3. Verify Database Connection

Run the diagnostic script:
```bash
cd apps/web
npx tsx scripts/check-db.ts
```

### 4. Restart Dev Server

After fixing, restart your Next.js dev server:
```bash
# Stop the current server (Ctrl+C)
# Then restart:
pnpm dev:web
```

## Common Issues

### Issue: DATABASE_URL has quotes
**Fix:** Remove quotes from `.env.local`:
```bash
# Before (wrong):
DATABASE_URL="file:./prisma/dev.db"

# After (correct):
DATABASE_URL=file:./prisma/dev.db
```

### Issue: Prisma models not found
**Fix:** Regenerate Prisma client:
```bash
cd apps/web
npx prisma generate
```

### Issue: Database file doesn't exist
**Fix:** Run migrations:
```bash
cd apps/web
npx prisma migrate dev
```

## Verification

After fixing, you should see:
- ✅ No "Database configuration error" messages
- ✅ `/api/plan/generate` works correctly
- ✅ Database queries succeed

If issues persist, check:
1. `.env.local` has correct `DATABASE_URL` (no quotes)
2. Prisma client is generated (`npx prisma generate`)
3. Database file exists at `prisma/dev.db`
4. Dev server was restarted after changes

