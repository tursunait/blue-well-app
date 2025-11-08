from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timedelta

router = APIRouter()


class WorkoutLogRequest(BaseModel):
    title: str
    type: Optional[str] = None  # "cardio", "strength", "yoga", etc.
    duration: int  # minutes
    caloriesBurned: Optional[int] = None
    notes: Optional[str] = None
    date: str  # ISO date string


class WorkoutLogResponse(BaseModel):
    id: str
    title: str
    type: Optional[str]
    duration: int
    caloriesBurned: Optional[int]
    date: str


class WeeklySummaryResponse(BaseModel):
    weekStart: str
    weekEnd: str
    totalWorkouts: int
    totalDuration: int  # minutes
    totalCaloriesBurned: int
    workouts: List[Dict[str, Any]]
    dailyStats: List[Dict[str, Any]]  # [{ date, workouts, calories }]


@router.post("/log")
async def log_workout(request: WorkoutLogRequest, user_id: str = "test-user-id"):
    """Log a workout"""
    try:
        # In production, save to database via Prisma
        return {
            "success": True,
            "workout": {
                "id": f"workout_{datetime.now().timestamp()}",
                "title": request.title,
                "type": request.type,
                "duration": request.duration,
                "caloriesBurned": request.caloriesBurned,
                "date": request.date,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_weekly_summary(user_id: str = "test-user-id", week_start: Optional[str] = None):
    """Get weekly workout summary with statistics"""
    try:
        # Calculate week start/end
        if week_start:
            start_date = datetime.fromisoformat(week_start).date()
        else:
            today = date.today()
            start_date = today - timedelta(days=today.weekday())

        end_date = start_date + timedelta(days=6)

        # In production, fetch from database
        # For now, return mock data
        return {
            "weekStart": start_date.isoformat(),
            "weekEnd": end_date.isoformat(),
            "totalWorkouts": 5,
            "totalDuration": 225,  # minutes
            "totalCaloriesBurned": 1200,
            "workouts": [
                {
                    "id": "w1",
                    "title": "Morning Run",
                    "type": "cardio",
                    "duration": 30,
                    "caloriesBurned": 250,
                    "date": (start_date + timedelta(days=0)).isoformat(),
                },
                {
                    "id": "w2",
                    "title": "Strength Training",
                    "type": "strength",
                    "duration": 45,
                    "caloriesBurned": 300,
                    "date": (start_date + timedelta(days=1)).isoformat(),
                },
            ],
            "dailyStats": [
                {
                    "date": (start_date + timedelta(days=i)).isoformat(),
                    "workouts": 1 if i < 2 else 0,
                    "calories": 250 if i == 0 else (300 if i == 1 else 0),
                }
                for i in range(7)
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

