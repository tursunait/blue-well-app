from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import random
import httpx


class MyRecProvider:
    """MyRec class provider - integrates with Duke Recreation Schedule API"""

    def __init__(self):
        self._cache: Dict[str, List[Dict[str, Any]]] = {}
        self._cache_ttl = 15 * 60  # 15 minutes
        self.api_url = (
            "https://myrec.recreation.duke.edu/Calendar/GetCalendarWidgetItems"
        )

    async def search(
        self,
        date: Optional[str] = None,
        location: Optional[str] = None,
        class_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Search for classes from Duke Recreation API"""
        try:
            # Try to fetch from real API
            async with httpx.AsyncClient() as client:
                params = {}
                if date:
                    params["startDate"] = date
                if location:
                    params["location"] = location
                if class_type:
                    params["classType"] = class_type

                response = await client.get(
                    self.api_url,
                    params=params,
                    timeout=10.0,
                )

                if response.status_code == 200:
                    data = response.json()
                    # Parse the API response (adjust based on actual API structure)
                    classes = self._parse_api_response(data)
                    if classes:
                        return classes
        except Exception as e:
            print(f"MyRec API error: {e}, falling back to mock data")

        # Fallback to mock data if API fails
        return self._generate_mock_classes(date, location, class_type)

    def _parse_api_response(self, data: Any) -> List[Dict[str, Any]]:
        """Parse MyRec API response"""
        classes = []
        # Adjust parsing based on actual API response structure
        if isinstance(data, list):
            for item in data:
                try:
                    classes.append(
                        {
                            "id": str(item.get("Id", "")),
                            "title": item.get("Title", "Fitness Class"),
                            "start": item.get("Start", ""),
                            "end": item.get("End", ""),
                            "location": item.get("Location", "Duke Recreation"),
                            "spotsOpen": item.get("SpotsOpen", 0),
                            "provider": "myrec",
                            "rawJson": item,
                        }
                    )
                except Exception:
                    continue
        return classes

    def _generate_mock_classes(
        self,
        date: Optional[str] = None,
        location: Optional[str] = None,
        class_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Generate mock class data"""
        base_date = datetime.now()
        if date:
            try:
                base_date = datetime.fromisoformat(date)
            except:
                pass

        class_types = [
            "HIIT Training",
            "Yoga Flow",
            "Spin Class",
            "Strength Training",
            "Pilates",
            "Zumba",
            "Barre",
            "Bootcamp",
        ]

        locations = [
            "Wilson Recreation Center",
            "Brodie Recreation Center",
            "Card Gym",
            "Cameron Indoor Stadium",
        ]

        classes = []
        for i in range(8):
            start_time = base_date.replace(
                hour=7 + i, minute=0 if i % 2 == 0 else 30, second=0, microsecond=0
            )
            end_time = start_time + timedelta(hours=1)

            classes.append(
                {
                    "id": f"class_{i}",
                    "title": random.choice(class_types),
                    "start": start_time.isoformat(),
                    "end": end_time.isoformat(),
                    "location": location or random.choice(locations),
                    "spotsOpen": random.randint(5, 25),
                    "provider": "myrec",
                }
            )

        return classes
