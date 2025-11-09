from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta
import csv
from pathlib import Path
from functools import lru_cache

DATA_PATH = Path(__file__).resolve().parents[3] / "data" / "duke_rec_schedule.csv"


def _parse_bool(value: str) -> bool:
    return str(value).strip().lower() in {"true", "1", "yes"}


class MyRecProvider:
    """MyRec class provider backed by the CSV schedule."""

    def __init__(self):
        self._schedule = self._load_schedule()

    async def search(
        self,
        date: Optional[str] = None,
        location: Optional[str] = None,
        class_type: Optional[str] = None,
        time_window: Optional[Tuple[int, int]] = None,
    ) -> List[Dict[str, Any]]:
        """Search for classes"""
        records = self._schedule

        if date:
            try:
                target_date = datetime.fromisoformat(date).date()
            except ValueError:
                target_date = None
            if target_date:
                records = [rec for rec in records if rec["start"].date() == target_date]

        if location:
            records = [rec for rec in records if rec["location"] and location.lower() in rec["location"].lower()]

        if class_type:
            records = [rec for rec in records if class_type.lower() in rec["title"].lower()]

        if time_window:
            start_h, end_h = time_window
            records = [rec for rec in records if start_h <= rec["start"].hour < end_h]

        # Convert to API-friendly dicts
        payload: List[Dict[str, Any]] = []
        for rec in records:
            payload.append({
                "id": rec["id"],
                "title": rec["title"],
                "start": rec["start"].isoformat(),
                "end": rec["end"].isoformat(),
                "location": rec["location"],
                "spotsOpen": rec["spots"],
                "provider": "myrec",
            })
        return payload

    @staticmethod
    @lru_cache(maxsize=1)
    def _load_schedule() -> List[Dict[str, Any]]:
        schedule: List[Dict[str, Any]] = []
        if not DATA_PATH.exists():
            return schedule

        with DATA_PATH.open("r", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                date_str = (row.get("Date") or "").strip()
                title = (row.get("Title") or "").strip()
                location = (row.get("Location") or "").strip() or "Duke Rec"
                start_time_str = (row.get("StartTime") or "").strip()
                is_all_day = _parse_bool(row.get("AllDay", "False"))
                if not date_str or not title:
                    continue

                try:
                    date_part = datetime.fromisoformat(date_str).date()
                except ValueError:
                    continue

                if is_all_day:
                    # Skip all-day events for chat suggestions
                    continue

                try:
                    time_part = datetime.strptime(start_time_str, "%I:%M %p").time()
                except ValueError:
                    time_part = datetime.min.time()
                start_dt = datetime.combine(date_part, time_part)
                end_dt = start_dt + timedelta(hours=1)

                schedule.append({
                    "id": f"{date_str}_{start_time_str}_{title}".replace(" ", "_"),
                    "title": title,
                    "start": start_dt,
                    "end": end_dt,
                    "location": location,
                    "spots": 10,
                })

        return sorted(schedule, key=lambda entry: entry["start"])
