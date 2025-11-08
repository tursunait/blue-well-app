from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from services.gcal import GoogleCalendarService

router = APIRouter()


class CalendarEvent(BaseModel):
    title: str
    startISO: str
    endISO: str
    location: Optional[str] = None
    notes: Optional[str] = None


@router.post("/add")
async def add_event(
    event: CalendarEvent,
    authorization: Optional[str] = Header(None),
):
    """Add event to Google Calendar"""
    try:
        # In production, verify the token from the header
        token = authorization.replace("Bearer ", "") if authorization else None
        if not token:
            raise HTTPException(status_code=401, detail="Missing authorization token")

        service = GoogleCalendarService()
        result = await service.add_event(event.dict(), token)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

