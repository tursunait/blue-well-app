# Calorie Estimator API Integration Setup

This document explains how to set up and use the calorie estimator integration in the Blue Well app.

## Overview

The log page now integrates with the calorie-estimator-api to automatically detect meals from photos and estimate their nutritional content.

## Prerequisites

1. **Calorie Estimator API** running at `/Users/msyzdykova/calorie-estimator-api`
2. **Blue Well App** at `/Users/msyzdykova/blue-well-app`
3. OpenAI API key configured in the calorie-estimator-api

## Setup Instructions

### 1. Start the Calorie Estimator API

```bash
cd /Users/msyzdykova/calorie-estimator-api

# Activate virtual environment
source venv/bin/activate

# Ensure .env file has your OpenAI API key
# OPENAI_API_KEY=your-key-here

# Start the API server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### 2. Configure Blue Well App

The environment variables are already set up in `/Users/msyzdykova/blue-well-app/apps/web/.env.local`:

```env
NEXT_PUBLIC_CALORIE_ESTIMATOR_URL=http://localhost:8000
```

### 3. Start the Blue Well App

```bash
cd /Users/msyzdykova/blue-well-app

# Install dependencies if needed
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`

## How It Works

### User Flow

1. **Navigate to Log Page**: Go to `/log` in the Blue Well app
2. **Snap Photo**: Click the "Snap Photo" button
3. **Upload Image**: Select a food image (JPG/PNG format)
4. **AI Analysis**: The image is sent to the calorie-estimator-api which uses OpenAI Vision to analyze it
5. **Review Results**: The detected meal name, calories, and macros are displayed
6. **Edit (Optional)**: Click "Edit" to manually adjust any values
7. **Confirm**: Click "Confirm" to add the meal to your daily totals
8. **Track Progress**: Calories and protein goals update automatically

### Features Implemented

- ✅ Photo upload functionality
- ✅ Integration with calorie-estimator-api
- ✅ AI-powered meal detection
- ✅ Automatic calorie and macro estimation
- ✅ Manual editing of nutritional values
- ✅ Real-time fitness goal updates
- ✅ Loading states and error handling

## Files Modified

### 1. `/apps/web/src/lib/api.ts`
- Added `estimateCalories()` function
- Added TypeScript interfaces for API responses
- Configured `CALORIE_ESTIMATOR_BASE_URL`

### 2. `/apps/web/src/app/log/page.tsx`
- Implemented photo upload with file input
- Added API integration for calorie estimation
- Created edit modal for manual adjustments
- Added state management for meals and fitness goals
- Implemented loading and error states

### 3. `/apps/web/.env.local`
- Created with `NEXT_PUBLIC_CALORIE_ESTIMATOR_URL` configuration

### 4. `/apps/web/.env.local.example`
- Updated with calorie estimator URL example

## API Endpoints Used

### POST /v1/estimate-calories

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `images`: File[] (JPEG/PNG images)
  - `hint`: string (optional - e.g., "vegetarian")
  - `plate_diameter_cm`: number (optional - for scale reference)

**Response:**
```typescript
{
  items: [{
    dish_name: string,
    estimated_calories: number,
    nutrition: {
      calories: number,
      protein_g: number,
      carbohydrates_g: number,
      fat_g: number,
      fiber_g: number,
      sugar_g: number,
      sodium_mg: number
    },
    confidence: number,
    rationale: string
  }],
  total_calories: number,
  model_used: string,
  images_processed: number
}
```

## Testing

1. Make sure both servers are running
2. Navigate to `http://localhost:3000/log`
3. Click "Snap Photo"
4. Select a food image
5. Verify that the meal is detected and nutritional info is displayed
6. Test the Edit functionality
7. Confirm the meal and verify goals update

## Troubleshooting

### API Connection Issues

If you see "Failed to estimate calories":
- Verify the calorie-estimator-api is running on port 8000
- Check the browser console for error messages
- Ensure the OpenAI API key is configured correctly

### CORS Errors

The calorie-estimator-api has CORS enabled with `allow_origins=["*"]` for development. In production, update this to specific origins.

### Image Upload Issues

- Only JPEG and PNG formats are supported
- Check file size limits
- Ensure proper file permissions

## Production Considerations

1. **Environment Variables**: Update `.env.local` to `.env.production` with production URLs
2. **CORS Configuration**: Restrict allowed origins in the calorie-estimator-api
3. **Error Handling**: Add user-friendly error messages
4. **Rate Limiting**: Implement rate limiting on API calls
5. **Image Optimization**: Consider adding image compression before upload
6. **Authentication**: Add authentication to protect API endpoints
7. **Persistence**: Save confirmed meals to database

## Future Enhancements

- [ ] Multiple image upload support
- [ ] Meal history and tracking
- [ ] Database integration for saving meals
- [ ] Barcode scanning
- [ ] Manual meal entry
- [ ] Meal templates and favorites
- [ ] Daily/weekly nutrition reports
- [ ] Recipe suggestions based on goals
