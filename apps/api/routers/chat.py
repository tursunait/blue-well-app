from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from services.enhanced_llm import EnhancedLLMProvider
from services.myrec_provider import MyRecProvider
from datetime import datetime, timedelta, date as date_class
import random
import re

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None
    conversation_history: Optional[List[Dict[str, str]]] = None
    user_profile: Optional[Dict[str, Any]] = None


class Suggestion(BaseModel):
    id: str
    kind: str  # "class", "workout", "meal"
    title: str
    desc: Optional[str] = None
    cta: str
    payload: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    type: str  # "message" or "suggestions"
    message: Optional[str] = None
    suggestions: Optional[List[Suggestion]] = None


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Handle chat requests with natural language understanding and personalized responses"""
    try:
        llm = EnhancedLLMProvider()
        classes_payload = await _fetch_duke_rec_classes_if_requested(request.message)
        if classes_payload:
            return _build_class_response(classes_payload)

        enriched_context = await _maybe_attach_duke_rec_classes(request.message, request.context)
        response = llm.generate(
            message=request.message,
            user_profile=request.user_profile,
            conversation_history=request.conversation_history,
            context=enriched_context,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def _maybe_attach_duke_rec_classes(message: str, base_context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    context = dict(base_context or {})
    classes_payload = await _fetch_duke_rec_classes_if_requested(message)
    if classes_payload:
        context["dukeRecClasses"] = classes_payload
    return context


async def _fetch_duke_rec_classes_if_requested(message: str) -> Optional[Dict[str, Any]]:
    lowered = (message or "").lower()
    if not any(keyword in lowered for keyword in ["class", "myrec", "duke rec"]):
        return None

    timeframe = _resolve_class_query(lowered)
    provider = MyRecProvider()
    items: List[Dict[str, Any]] = []
    for day in timeframe["dates"]:
        iso_date = day.isoformat()
        day_classes = await provider.search(date=iso_date, time_window=timeframe.get("time_window"))
        items.extend(day_classes)

    if items:
        random.shuffle(items)
        return {
            "timeframe": timeframe["label"],
            "items": items[:20],
        }
    return None


def _determine_class_window(message: str) -> Dict[str, Any]:
    if "tomorrow" in message:
        return {"label": "tomorrow", "offset_days": 1, "days": 1}
    if "week" in message:
        return {"label": "this week", "offset_days": 0, "days": 7}
    if "weekend" in message:
        today = datetime.now().date()
        days_until_sat = (5 - today.weekday()) % 7
        return {"label": "this weekend", "offset_days": days_until_sat, "days": 2}
    return {"label": "today", "offset_days": 0, "days": 1}


def _build_class_response(payload: Dict[str, Any]) -> ChatResponse:
    items = payload.get("items", [])
    timeframe = payload.get("timeframe", "the requested window")
    suggestions: List[Suggestion] = []

    for idx, cls in enumerate(items[:4]):
        title = cls.get("title", "Class")
        start = cls.get("start")
        end = cls.get("end")
        location = cls.get("location", "Duke Rec")
        start_dt = None
        end_dt = None
        try:
            if start:
                start_dt = datetime.fromisoformat(start)
        except Exception:
            start_dt = None
        try:
            if end:
                end_dt = datetime.fromisoformat(end)
        except Exception:
            end_dt = None

        if start_dt:
            date_label = start_dt.strftime("%a %b %d")
            time_label = start_dt.strftime("%I:%M %p").lstrip("0")
        else:
            date_label = "Date TBA"
            time_label = start or "Time TBA"

        if end_dt:
            time_label = f"{time_label} – {end_dt.strftime('%I:%M %p').lstrip('0')}"

        suggestions.append(
            Suggestion(
                id=cls.get("id", f"cls_{idx}"),
                kind="class",
                title=title,
                desc=f"{date_label} • {time_label} at {location}",
                cta="Add to Calendar",
                payload={
                    "startISO": start,
                    "endISO": end,
                    "location": location,
                },
            )
        )

    if suggestions:
        message = (
            f"Here are Duke Rec classes available {timeframe}. "
            "Need a different date or time window? Ask something like 'classes on 2025-11-10 evening'."
        )
    else:
        message = (
            "I couldn't find Duke Rec classes for that timeframe. "
            "Try asking with a format like 'classes on 2025-11-10 morning'."
        )

    return ChatResponse(type="suggestions", message=message, suggestions=suggestions or None)


def _suggestions_to_text(response: ChatResponse) -> ChatResponse:
    parts: List[str] = []
    if response.message:
        parts.append(response.message.strip())
    for suggestion in response.suggestions or []:
        detail = []
        payload = suggestion.payload or {}
        start = payload.get("startISO")
        if start:
            try:
                start_dt = datetime.fromisoformat(start)
                detail.append(start_dt.strftime("%a %I:%M %p").lstrip("0"))
            except ValueError:
                detail.append(start)
        if payload.get("location"):
            detail.append(payload["location"])
        descriptor = " • ".join(detail)
        line = f"- {suggestion.title}"
        if descriptor:
            line += f" ({descriptor})"
        if suggestion.desc:
            line += f": {suggestion.desc}"
        parts.append(line)
    parts.append("Need something else? Ask away—I'm listening.")
    return ChatResponse(type="message", message="\n".join(parts))


def _resolve_class_query(message: str) -> Dict[str, Any]:
    custom_date = _parse_specific_date(message)
    time_window = _parse_time_window(message)

    if custom_date:
        label = f"on {custom_date.strftime('%a %b %d')}"
        if time_window:
            label += f" ({_time_window_label(time_window)})"
        return {"label": label, "dates": [custom_date], "time_window": time_window}

    base = _determine_class_window(message)
    start_date = datetime.now().date() + timedelta(days=base["offset_days"])
    dates = [start_date + timedelta(days=i) for i in range(base["days"])]
    if time_window:
        label = f"{base['label']} ({_time_window_label(time_window)})"
    else:
        label = base["label"]
    return {"label": label, "dates": dates, "time_window": time_window}


def _parse_specific_date(message: str) -> Optional[date_class]:
    iso_match = re.search(r"(20\d{2}-\d{1,2}-\d{1,2})", message)
    if iso_match:
        try:
            return datetime.fromisoformat(iso_match.group(1)).date()
        except ValueError:
            pass

    slash_match = re.search(r"(\d{1,2}/\d{1,2}(?:/\d{2,4})?)", message)
    if slash_match:
        parts = slash_match.group(1).split("/")
        month = int(parts[0])
        day = int(parts[1])
        year = int(parts[2]) if len(parts) == 3 else datetime.now().year
        try:
            return datetime(year, month, day).date()
        except ValueError:
            pass

    month_map = {
        "january": 1,
        "february": 2,
        "march": 3,
        "april": 4,
        "may": 5,
        "june": 6,
        "july": 7,
        "august": 8,
        "september": 9,
        "october": 10,
        "november": 11,
        "december": 12,
    }
    month_regex = r"(january|february|march|april|may|june|july|august|september|october|november|december)"  # noqa: E501
    month_match = re.search(month_regex + r"\s+(\d{1,2})(?:,\s*(\d{4}))?", message)
    if month_match:
        month = month_map[month_match.group(1)]
        day = int(month_match.group(2))
        year = int(month_match.group(3)) if month_match.group(3) else datetime.now().year
        try:
            return datetime(year, month, day).date()
        except ValueError:
            pass

    return None


def _parse_time_window(message: str) -> Optional[tuple[int, int]]:
    mapping = {
        "morning": (5, 12),
        "afternoon": (12, 17),
        "evening": (17, 22),
        "night": (20, 24),
    }
    for keyword, window in mapping.items():
        if keyword in message:
            return window
    return None


def _time_window_label(window: tuple[int, int]) -> str:
    reverse = {
        (5, 12): "morning",
        (12, 17): "afternoon",
        (17, 22): "evening",
        (20, 24): "night",
    }
    return reverse.get(window, f"{window[0]}:00-{window[1]}:00")
