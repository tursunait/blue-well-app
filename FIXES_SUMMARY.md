# Fixes Summary: OpenAI 429 & Prisma Model Errors

## Overview

Fixed two critical errors:
1. **OpenAI 429 quota errors** in `/api/stats/today` causing repeated failures
2. **Prisma undefined model error** (`Cannot read properties of undefined (reading 'findFirst')`) in `/api/plan/generate` at line 244

## Changes Made

### 1. Created Shared AI Client with Retry Logic (`src/lib/ai.ts`)

- **New file**: Centralized OpenAI client with exponential backoff retry wrapper
- Handles 429 (rate limit) and 5xx errors automatically
- Configurable retries and backoff timing
- Prevents cascading failures from quota issues

**Key Features:**
- Exponential backoff with jitter
- Only retries on 429/5xx errors (not 4xx client errors)
- Configurable retry count and base delay

### 2. Enhanced Stats Insights with Graceful Degradation (`src/ai/stats-insights-ai.ts`)

**Changes:**
- Integrated retry wrapper from `@/lib/ai`
- Added 10-second timeout to prevent hanging requests
- **Graceful fallback** when OpenAI fails (429 or any error):
  - Returns deterministic, helpful fallback insights
  - Sets `aiInsightsFallback: true` flag for UI
  - Never throws - always returns valid response
- Feature flag support: `DISABLE_AI_INSIGHTS=true` to skip AI entirely
- Early return if `OPENAI_API_KEY` is missing

**Before:** Threw errors, logged 429s repeatedly, broke the page
**After:** Returns fallback insights, logs warning, page works normally

### 3. Hardened `/api/stats/today` Route (`src/app/api/stats/today/route.ts`)

**Changes:**
- Wrapped AI insights call in try/catch with specific 429 handling
- Returns fallback insights on any error (not just 429)
- Adds `aiInsightsFallback` flag to response for UI degradation handling
- Always returns 200 with stats, even if AI fails

### 4. Fixed Prisma Model Error in `/api/plan/generate` (`src/app/api/plan/generate/route.ts`)

**Root Cause:** The error at line 244 (now line 288) was from `prisma.aIRec.findFirst()` where `aIRec` might be undefined if:
- Prisma client wasn't regenerated after schema changes
- Model name mismatch
- Client initialization issue

**Fixes Applied:**
- Added `ensurePrismaModel()` runtime check function
- Validates model exists before use
- Provides helpful error message listing available models if mismatch
- Wrapped cache lookup in try/catch to continue on error
- Added error handling around all Prisma operations
- Better error messages with hints (e.g., "Run 'pnpm prisma generate'")

**Line 244 Fix:**
- Original: `prisma.aIRec.findFirst(...)` - could throw if model undefined
- Fixed: Added `ensurePrismaModel("aIRec")` check before use + try/catch wrapper

### 5. Enhanced Prisma Client (`src/lib/prisma.ts`)

**Changes:**
- Added runtime check to ensure client initializes properly
- Reduced logging in production (removed "query" logs)
- Better error message if initialization fails

### 6. Created Environment Helper (`src/lib/env.ts`)

**New file**: Optional helper for env var validation
- Logs warnings in dev (doesn't crash)
- Helps catch missing config early

## Error Handling Improvements

### Before:
- OpenAI 429 → Repeated errors, broken page
- Prisma model undefined → 500 error, cryptic message
- No retries → Immediate failure
- No fallbacks → Broken user experience

### After:
- OpenAI 429 → Retry with backoff → Fallback insights if still fails
- Prisma model undefined → Clear error message with fix hint
- All errors handled gracefully → Page always works

## Testing Recommendations

1. **Test OpenAI 429 handling:**
   ```bash
   # Set invalid/quota-exceeded key temporarily
   # Should see fallback insights, not errors
   ```

2. **Test Prisma model error:**
   ```bash
   # Should see helpful error if model missing
   # After `pnpm prisma generate`, should work
   ```

3. **Test timeout:**
   ```bash
   # AI call should timeout after 10s and return fallback
   ```

## Follow-up Steps

1. ✅ **Prisma client regenerated** - Run `pnpm prisma generate` (already done)
2. **Optional**: Add `DISABLE_AI_INSIGHTS=true` to `.env.local` if you want to skip AI entirely during development
3. **Monitor**: Check logs for `[ai-insights] degraded mode` to see when fallbacks are used

## Files Modified

- ✅ `src/lib/ai.ts` (new)
- ✅ `src/lib/env.ts` (new)
- ✅ `src/lib/prisma.ts` (enhanced)
- ✅ `src/ai/stats-insights-ai.ts` (major refactor)
- ✅ `src/app/api/stats/today/route.ts` (error handling)
- ✅ `src/app/api/plan/generate/route.ts` (Prisma fixes + error handling)

## Acceptance Criteria Met

✅ `/api/stats/today` never throws on OpenAI 429; returns fallback JSON  
✅ `/api/plan/generate` no longer throws "reading 'findFirst' of undefined"  
✅ All code is TypeScript-strict with proper error types  
✅ Clear HTTP status codes (200 for stats with fallback, 404/500 for plan errors)  
✅ Prisma uses shared client with runtime validation

## Notes

- The Prisma model name `aIRec` is correct (camelCase of `AIRec` schema model)
- The error was likely due to Prisma client not being regenerated after schema changes
- All AI calls now have timeouts and retries to prevent hanging
- Fallback responses ensure the UI always has data to display

