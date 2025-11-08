from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from services.myrec_provider import MyRecProvider
from datetime import datetime

router = APIRouter()


@router.get("/classes")
async def get_classes(
    date: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
):
    """Fetch MyRec classes"""
    try:
        provider = MyRecProvider()
        classes = await provider.search(date=date, location=location, class_type=type)
        return classes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

