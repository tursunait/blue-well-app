from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, date

router = APIRouter()


class DailyPlanRequest(BaseModel):
    date: str  # ISO date string
    planJson: Dict[str, Any]  # { workouts: [], meals: [], classes: [] }


class DailyPlanResponse(BaseModel):
    id: str
    date: str
    planJson: Dict[str, Any]
    isSaved: bool
    emailSent: bool


@router.post("/save")
async def save_daily_plan(request: DailyPlanRequest, user_id: str = "test-user-id"):
    """Save a daily plan for the user"""
    # In production, get user_id from auth token
    # For now, using test user
    try:
        # This would interact with the database via Prisma
        # For now, return success
        return {
            "success": True,
            "message": "Daily plan saved successfully",
            "plan": {
                "id": f"plan_{datetime.now().timestamp()}",
                "date": request.date,
                "planJson": request.planJson,
                "isSaved": True,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/email")
async def email_daily_plan(request: DailyPlanRequest, user_id: str = "test-user-id"):
    """Email daily plan to user"""
    try:
        # In production, send email via email service
        # For now, return success
        return {
            "success": True,
            "message": "Daily plan emailed successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{date}")
async def get_daily_plan(date: str, user_id: str = "test-user-id"):
    """Get daily plan for a specific date"""
    try:
        # In production, fetch from database
        return {
            "date": date,
            "planJson": {"workouts": [], "meals": [], "classes": []},
            "isSaved": False,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
