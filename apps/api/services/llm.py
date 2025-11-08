from typing import Dict, Any, List, Optional
import random
from datetime import datetime, timedelta


class LLMProvider:
    """Abstract LLM provider - returns deterministic sample data in dev"""

    def generate(
        self, message: str, context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate response based on message"""
        message_lower = message.lower()

        # Rule-based responses for MVP
        if "daily plan" in message_lower or "recommendations" in message_lower:
            return {
                "type": "suggestions",
                "suggestions": self._generate_daily_suggestions(),
            }
        elif "replan" in message_lower:
            return {
                "type": "suggestions",
                "suggestions": self._generate_replan_suggestions(),
            }
        elif "workout" in message_lower:
            return {
                "type": "suggestions",
                "suggestions": self._generate_workout_suggestions(),
            }
        elif "class" in message_lower or "myrec" in message_lower:
            return {
                "type": "suggestions",
                "suggestions": self._generate_class_suggestions(),
            }
        elif "meal" in message_lower:
            return {
                "type": "suggestions",
                "suggestions": self._generate_meal_suggestions(),
            }
        else:
            return {
                "type": "message",
                "message": "I'm here to help you with workouts, meals, and classes. What would you like to do?",
            }

    def _generate_daily_suggestions(self) -> List[Dict[str, Any]]:
        """Generate daily recommendation suggestions"""
        now = datetime.now()
        morning = (now.replace(hour=7, minute=0, second=0, microsecond=0)).isoformat()
        afternoon = (
            now.replace(hour=14, minute=0, second=0, microsecond=0)
        ).isoformat()
        evening = (now.replace(hour=18, minute=0, second=0, microsecond=0)).isoformat()

        return [
            {
                "id": "1",
                "kind": "workout",
                "title": "Morning Yoga Flow",
                "desc": "30-minute gentle yoga to start your day",
                "cta": "Add to Calendar",
                "payload": {
                    "startISO": morning,
                    "endISO": (
                        datetime.fromisoformat(morning) + timedelta(minutes=30)
                    ).isoformat(),
                },
            },
            {
                "id": "2",
                "kind": "meal",
                "title": "Protein-Packed Breakfast Bowl",
                "desc": "Greek yogurt with berries and granola",
                "cta": "Log Meal",
                "payload": {
                    "kcal": 320,
                    "protein": 25,
                },
            },
            {
                "id": "3",
                "kind": "class",
                "title": "HIIT Class at Downtown Studio",
                "desc": "High-intensity interval training",
                "cta": "Reserve Spot",
                "payload": {
                    "startISO": evening,
                    "endISO": (
                        datetime.fromisoformat(evening) + timedelta(hours=1)
                    ).isoformat(),
                    "location": "Downtown Studio",
                },
            },
        ]

    def _generate_replan_suggestions(self) -> List[Dict[str, Any]]:
        """Generate replan suggestions"""
        return self._generate_daily_suggestions()

    def _generate_workout_suggestions(self) -> List[Dict[str, Any]]:
        """Generate workout suggestions"""
        now = datetime.now()
        start = (now.replace(hour=18, minute=0, second=0, microsecond=0)).isoformat()

        return [
            {
                "id": "w1",
                "kind": "workout",
                "title": "Evening Strength Training",
                "desc": "45-minute full body workout",
                "cta": "Add to Calendar",
                "payload": {
                    "startISO": start,
                    "endISO": (
                        datetime.fromisoformat(start) + timedelta(minutes=45)
                    ).isoformat(),
                },
            },
        ]

    def _generate_class_suggestions(self) -> List[Dict[str, Any]]:
        """Generate class suggestions"""
        now = datetime.now()
        start = (now.replace(hour=19, minute=0, second=0, microsecond=0)).isoformat()

        return [
            {
                "id": "c1",
                "kind": "class",
                "title": "Spin Class - Evening Session",
                "desc": "High-energy cycling class",
                "cta": "Reserve Spot",
                "payload": {
                    "startISO": start,
                    "endISO": (
                        datetime.fromisoformat(start) + timedelta(minutes=60)
                    ).isoformat(),
                    "location": "Fitness Center",
                },
            },
        ]

    def _generate_meal_suggestions(self) -> List[Dict[str, Any]]:
        """Generate meal suggestions"""
        return [
            {
                "id": "m1",
                "kind": "meal",
                "title": "Grilled Salmon with Quinoa",
                "desc": "High protein, balanced macros",
                "cta": "Log Meal",
                "payload": {
                    "kcal": 520,
                    "protein": 42,
                },
            },
        ]
