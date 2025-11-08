from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from services.calorie import CalorieEstimator
from typing import List, Dict, Any, Optional

router = APIRouter()


class MealItem(BaseModel):
    name: str
    kcal: int
    protein: float
    fat: float
    carbs: float
    confidence: Optional[float] = None


class MealEstimate(BaseModel):
    items: List[MealItem]
    totals: Dict[str, Any]


@router.post("/estimate")
async def estimate_calories(file: UploadFile = File(...)):
    """Estimate calories and macros from meal photo"""
    try:
        estimator = CalorieEstimator()
        result = await estimator.estimate(file)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

