from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import random


class MyRecProvider:
    """MyRec class provider - stub with in-memory cache"""

    def __init__(self):
        self._cache: Dict[str, List[Dict[str, Any]]] = {}
        self._cache_ttl = 15 * 60  # 15 minutes

    async def search(
        self, date: Optional[str] = None, location: Optional[str] = None, class_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search for classes"""
        # Generate mock data
        base_date = datetime.now()
        if date:
            try:
                base_date = datetime.fromisoformat(date)
            except:
                pass

        classes = []
        for i in range(5):
            start_time = base_date.replace(hour=9 + i * 2, minute=0, second=0, microsecond=0)
            end_time = start_time + timedelta(hours=1)

            classes.append({
                "id": f"class_{i}",
                "title": random.choice([
                    "HIIT Training",
                    "Yoga Flow",
                    "Spin Class",
                    "Strength Training",
                    "Pilates",
                ]),
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
                "location": location or random.choice(["Downtown Studio", "Fitness Center", "Main Gym"]),
                "spotsOpen": random.randint(5, 20),
                "provider": "myrec",
            })

        return classes

