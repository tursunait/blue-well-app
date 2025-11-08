# Chatbot Enhancements Summary

## Overview
Enhanced the chatbot with personalized recommendations, contextual memory, external API integrations, daily planning, and progress tracking.

## Features Implemented

### 1. Contextual Memory ✅
- **Implementation**: Chat maintains last 3-5 conversation messages
- **Location**: `apps/web/src/app/chat/page.tsx`
- **How it works**: Conversation history is passed to the API with each request, allowing the chatbot to provide relevant follow-up suggestions based on previous interactions

### 2. User Profiling ✅
- **Implementation**: User profile data (from onboarding) is fetched and passed to chat API
- **Location**: 
  - Frontend: `apps/web/src/app/chat/page.tsx`
  - Backend: `apps/api/services/enhanced_llm.py`
- **Data used**: Age, gender, goals, diet preferences, time preferences, weekly workout targets

### 3. External Data Integration ✅

#### a. Duke Recreation Schedule API
- **Implementation**: Real API integration with fallback to mock data
- **Location**: `apps/api/services/myrec_provider.py`
- **Endpoint**: `https://myrec.recreation.duke.edu/Calendar/GetCalendarWidgetItems`
- **Features**: 
  - Fetches real class schedules from Duke Recreation
  - Filters by date, location, and class type
  - Falls back to mock data if API fails

#### b. Weather API Integration
- **Implementation**: OpenWeatherMap API integration
- **Location**: `apps/api/services/weather.py`
- **Features**:
  - Gets current weather conditions
  - Recommends indoor/outdoor workouts based on weather
  - Considers temperature, precipitation, and wind speed
  - Falls back to mock data if API key not configured

#### c. Calendar Integration
- **Implementation**: Enhanced calendar event creation
- **Location**: `apps/web/src/app/chat/page.tsx`
- **Features**: Automatically adds workouts and meals to user's calendar

### 4. Daily Planner ✅
- **Implementation**: Save and email daily plans
- **Location**:
  - Backend: `apps/api/routers/planner.py`
  - Frontend: `apps/web/src/app/chat/page.tsx`
- **Features**:
  - "Save my plan" button appears when daily plan is generated
  - "Email me my plan" button to email the plan
  - Plans include workouts, meals, and classes
  - Database model: `DailyPlan` in Prisma schema

### 5. Progress Tracking ✅
- **Implementation**: Workout logging and weekly summaries with charts
- **Location**:
  - Backend: `apps/api/routers/workouts.py`
  - Frontend: `apps/web/src/app/progress/page.tsx`
- **Features**:
  - Log workouts with duration, calories burned, type
  - Weekly summary with:
    - Total workouts, duration, calories burned
    - Daily activity chart (bar chart visualization)
    - Recent workouts list
  - Database model: `WorkoutLog` in Prisma schema

## Database Schema Changes

### New Models Added:
1. **ChatMessage**: Stores conversation history
   - userId, role, content, metadata, createdAt

2. **DailyPlan**: Stores saved daily plans
   - userId, date, planJson, isSaved, emailSent

3. **WorkoutLog**: Tracks workout sessions
   - userId, title, type, duration, caloriesBurned, date

## API Endpoints

### New Endpoints:
- `POST /chat` - Enhanced with user profile and conversation history
- `POST /planner/save` - Save daily plan
- `POST /planner/email` - Email daily plan
- `GET /planner/{date}` - Get daily plan for date
- `POST /workouts/log` - Log a workout
- `GET /workouts/summary` - Get weekly workout summary

## Enhanced LLM Service

### Location: `apps/api/services/enhanced_llm.py`

### Features:
- Personalized recommendations based on user profile
- Weather-aware workout suggestions
- Real MyRec class integration
- Contextual follow-ups based on conversation history
- Meal suggestions based on dietary preferences
- Goal-oriented workout recommendations

## Frontend Enhancements

### Chat Page (`apps/web/src/app/chat/page.tsx`)
- Maintains conversation history (last 5 messages)
- Fetches and passes user profile
- Shows "Save my plan" and "Email me my plan" buttons when plan is generated
- Automatically logs workouts when added to calendar

### Progress Page (`apps/web/src/app/progress/page.tsx`)
- Weekly summary with metrics
- Daily activity bar chart
- Recent workouts list
- Empty state for no workouts

## Environment Variables

### Optional:
- `OPENWEATHER_API_KEY` - For weather API (optional, falls back to mock data)

## Next Steps / Future Enhancements

1. **Database Integration**: Connect planner and workout endpoints to actual Prisma database
2. **Email Service**: Implement actual email sending for daily plans
3. **MyRec Reservation**: Integrate actual class reservation API
4. **Advanced Charts**: Add more detailed progress visualizations
5. **LLM Integration**: Replace rule-based responses with actual LLM (OpenAI, Anthropic, etc.)
6. **Calendar Sync**: Two-way sync with Google Calendar

## Testing

To test the enhancements:

1. **Chat with Context**:
   - Ask "suggest a workout"
   - Follow up with "when should I do it?"
   - Bot should remember the workout context

2. **Personalized Recommendations**:
   - Complete onboarding with preferences
   - Ask "daily plan" - should use your preferences

3. **Weather Integration**:
   - Ask "suggest a workout" - should consider weather
   - Weather affects indoor/outdoor recommendations

4. **Daily Planner**:
   - Ask "daily plan"
   - Use "Save my plan" and "Email me my plan" buttons

5. **Progress Tracking**:
   - Add workouts via chat suggestions
   - Visit `/progress` to see weekly summary

## Migration Required

Run database migration to add new models:
```bash
cd apps/web
pnpm prisma generate
pnpm prisma migrate dev --name add_chat_planner_workouts
```

Or use the setup script:
```bash
./setup-db.sh
```

