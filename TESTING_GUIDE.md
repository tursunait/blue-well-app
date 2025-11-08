# Testing Guide - Chatbot Enhancements

## Quick Start Testing

### 1. Start the Servers

**Terminal 1 - Backend API:**
```bash
cd /Users/Afag/blue-well-app/apps/api
python3 -m uvicorn main:app --reload
```
You should see: `Uvicorn running on http://127.0.0.1:8000`

**Terminal 2 - Frontend Web App:**
```bash
cd /Users/Afag/blue-well-app
pnpm dev:web
```
You should see: `Ready on http://localhost:3000`

**Terminal 3 - Database (if not already running):**
```bash
docker ps | grep postgres
# If not running:
docker-compose -f infra/docker-compose.yml up -d postgres
```

### 2. Apply Database Migrations

Before testing, make sure the new database models are created:

```bash
cd /Users/Afag/blue-well-app/apps/web
pnpm prisma generate
```

Then apply the migration manually (since Prisma migrate had issues):
```bash
# The schema is already updated, but we need to create the tables
# You can use the setup-db.sh script or apply SQL directly
```

## Testing Checklist

### ✅ Test 1: Basic Chat Functionality
1. Open http://localhost:3000/chat
2. Type: "suggest a workout"
3. **Expected**: You should see workout suggestions with "Add to Calendar" buttons

### ✅ Test 2: Contextual Memory
1. In chat, type: "suggest a workout"
2. Wait for response
3. Type: "when should I do it?"
4. **Expected**: Bot should remember you asked about workouts and provide time suggestions

### ✅ Test 3: Personalized Recommendations
1. Make sure you've completed onboarding (or test user exists)
2. In chat, type: "daily plan"
3. **Expected**: 
   - Personalized plan based on your profile
   - Weather-aware workout recommendations
   - Meal suggestions matching your diet preferences
   - "Save my plan" and "Email me my plan" buttons appear

### ✅ Test 4: Weather Integration
1. Type: "suggest a workout"
2. **Expected**: 
   - If weather is good: "Great weather today! Perfect for outdoor activities..."
   - If weather is bad: "It's [condition] outside. Perfect for indoor workouts..."

### ✅ Test 5: MyRec Class Integration
1. Type: "find a class" or "myrec classes"
2. **Expected**: List of available classes from Duke Recreation (or mock data if API fails)

### ✅ Test 6: Daily Planner Save/Email
1. Type: "daily plan"
2. Wait for plan to appear
3. Click "Save my plan"
4. **Expected**: Success message "Your daily plan has been saved!"
5. Click "Email me my plan"
6. **Expected**: Success message "Your daily plan has been emailed to you!"

### ✅ Test 7: Workout Logging
1. Type: "suggest a workout"
2. Click "Add to Calendar" on a workout suggestion
3. **Expected**: Workout is logged automatically
4. Visit http://localhost:3000/progress
5. **Expected**: See the workout in your weekly summary

### ✅ Test 8: Progress Tracking
1. Visit http://localhost:3000/progress
2. **Expected**: 
   - Weekly summary with metrics
   - Daily activity bar chart
   - Recent workouts list (if any logged)

## Debugging

### Check API is Running
```bash
curl http://localhost:8000/health
# Should return: {"status":"ok"}
```

### Check API Docs
Visit http://localhost:8000/docs
- Should show all endpoints including `/chat`, `/planner`, `/workouts`

### Check Console for Errors
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab to see API requests

### Common Issues

**Issue: "Chat request failed"**
- Check if API is running on port 8000
- Check browser console for CORS errors
- Verify `NEXT_PUBLIC_FASTAPI_BASE_URL` in `.env.local`

**Issue: "Failed to fetch profile"**
- Make sure you're logged in (dev mode auto-logs in)
- Check `/api/profile` endpoint works

**Issue: No personalized recommendations**
- Verify user profile exists in database
- Check that profile data is being fetched

**Issue: Database errors**
- Make sure PostgreSQL is running: `docker ps | grep postgres`
- Check DATABASE_URL in `.env.local`

## API Testing with curl

### Test Chat Endpoint
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "suggest a workout",
    "user_profile": {
      "primaryGoal": "General fitness",
      "timePrefs": ["morning", "evening"],
      "dietPrefs": ["Vegetarian"]
    }
  }'
```

### Test Weekly Summary
```bash
curl http://localhost:8000/workouts/summary
```

### Test Save Plan
```bash
curl -X POST http://localhost:8000/planner/save \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-11-08",
    "planJson": {
      "workouts": [{"title": "Morning Run"}],
      "meals": [{"title": "Breakfast Bowl"}],
      "classes": []
    }
  }'
```

## Visual Verification

### What You Should See:

1. **Chat Page** (`/chat`):
   - Clean chat interface
   - Quick reply buttons when empty
   - Suggestions appear as cards
   - "Save my plan" / "Email me my plan" buttons when plan is generated

2. **Progress Page** (`/progress`):
   - Three metric cards (Total Workouts, Duration, Calories)
   - Daily activity bar chart
   - Recent workouts list (if any)

3. **API Docs** (`http://localhost:8000/docs`):
   - All new endpoints visible
   - Can test endpoints directly

## Next Steps After Testing

If everything works:
1. ✅ All features are functional
2. ✅ Ready to use in development

If something doesn't work:
1. Check error messages in browser console
2. Check API logs in terminal
3. Verify database connection
4. Check environment variables

