from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from services.weather import WeatherService
from services.myrec_provider import MyRecProvider


class EnhancedLLMProvider:
    """Enhanced LLM provider with user context, memory, and external integrations"""

    def __init__(self):
        self.weather_service = WeatherService()
        self.myrec_provider = MyRecProvider()

    async def generate(
        self,
        message: str,
        user_profile: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Generate personalized response based on message, user profile, and conversation history"""
        message_lower = message.lower()

        # Get weather for workout recommendations
        weather_data = await self.weather_service.get_current_weather()

        # Analyze conversation history for context
        recent_topics = self._analyze_conversation_history(conversation_history or [])

        # Generate personalized suggestions
        if "daily plan" in message_lower or "plan" in message_lower or "recommendations" in message_lower:
            return await self._generate_personalized_daily_plan(
                user_profile, weather_data, recent_topics
            )
        elif "replan" in message_lower or "change" in message_lower:
            return await self._generate_replan_suggestions(user_profile, weather_data)
        elif "workout" in message_lower or "exercise" in message_lower:
            return await self._generate_personalized_workout_suggestions(
                user_profile, weather_data, recent_topics
            )
        elif "class" in message_lower or "myrec" in message_lower or "schedule" in message_lower:
            return await self._generate_class_suggestions(user_profile, recent_topics)
        elif "meal" in message_lower or "food" in message_lower or "eat" in message_lower:
            return await self._generate_personalized_meal_suggestions(user_profile, recent_topics)
        elif "save" in message_lower and "plan" in message_lower:
            return {
                "type": "message",
                "message": "I can help you save your daily plan! Use the 'Save my plan' button below.",
                "action": "save_plan",
            }
        elif "email" in message_lower and "plan" in message_lower:
            return {
                "type": "message",
                "message": "I can email you your plan! Use the 'Email me my plan' button below.",
                "action": "email_plan",
            }
        elif "progress" in message_lower or "track" in message_lower or "summary" in message_lower:
            return {
                "type": "message",
                "message": "Let me show you your progress! Check out your weekly summary with workouts and calories burned.",
                "action": "show_progress",
            }
        else:
            # Contextual follow-up based on conversation history
            if recent_topics:
                follow_up = self._generate_contextual_followup(recent_topics, message_lower)
                if follow_up:
                    return follow_up

            return {
                "type": "message",
                "message": self._get_personalized_greeting(user_profile)
                + " I can help you with workouts, meals, classes, and daily planning. What would you like to do?",
            }

    def _analyze_conversation_history(self, history: List[Dict[str, str]]) -> List[str]:
        """Extract topics from conversation history"""
        topics = []
        for msg in history[-5:]:  # Last 5 messages
            content = msg.get("content", "").lower()
            if "workout" in content or "exercise" in content:
                topics.append("workout")
            elif "meal" in content or "food" in content:
                topics.append("meal")
            elif "class" in content:
                topics.append("class")
            elif "plan" in content:
                topics.append("plan")
        return topics

    def _get_personalized_greeting(self, profile: Optional[Dict[str, Any]]) -> str:
        """Get personalized greeting based on user profile"""
        if not profile:
            return "Hi! "
        name = profile.get("name") or ""
        goal = profile.get("primaryGoal", "")
        if name:
            return f"Hi {name}! "
        if goal:
            return f"Hi! I see you're working on {goal.lower()}. "
        return "Hi! "

    def _generate_contextual_followup(self, topics: List[str], current_message: str) -> Optional[Dict[str, Any]]:
        """Generate contextual follow-up based on conversation history"""
        if "workout" in topics and any(word in current_message for word in ["when", "time", "schedule"]):
            return {
                "type": "message",
                "message": "Based on our earlier conversation about workouts, let me suggest some times that work with your schedule.",
                "suggestions": self._generate_workout_suggestions_simple(),
            }
        return None

    async def _generate_personalized_daily_plan(
        self,
        user_profile: Optional[Dict[str, Any]],
        weather_data: Dict[str, Any],
        recent_topics: List[str],
    ) -> Dict[str, Any]:
        """Generate personalized daily plan"""
        time_prefs = user_profile.get("timePrefs", []) if user_profile else ["morning", "evening"]
        goal = user_profile.get("primaryGoal", "General fitness") if user_profile else "General fitness"
        diet_prefs = user_profile.get("dietPrefs", []) if user_profile else []

        now = datetime.now()
        suggestions = []

        # Workout based on weather and preferences
        workout_rec = self.weather_service.get_workout_recommendation(weather_data)
        if "morning" in time_prefs:
            morning_time = now.replace(hour=7, minute=0, second=0, microsecond=0)
            suggestions.append({
                "id": "w1",
                "kind": "workout",
                "title": "Morning " + ("Outdoor Run" if weather_data.get("recommendation") == "outdoor" else "Yoga Flow"),
                "desc": workout_rec,
                "cta": "Add to Calendar",
                "payload": {
                    "startISO": morning_time.isoformat(),
                    "endISO": (morning_time + timedelta(minutes=30)).isoformat(),
                    "type": "cardio" if weather_data.get("recommendation") == "outdoor" else "yoga",
                },
            })

        # Meal suggestions based on diet preferences
        meal_suggestion = self._get_meal_for_preferences(diet_prefs, goal)
        suggestions.append(meal_suggestion)

        # Class suggestion from MyRec
        classes = await self.myrec_provider.search()
        if classes:
            class_item = classes[0]
            suggestions.append({
                "id": class_item["id"],
                "kind": "class",
                "title": class_item["title"],
                "desc": f"Available at {class_item['location']}",
                "cta": "Reserve Spot",
                "payload": {
                    "startISO": class_item["start"],
                    "endISO": class_item["end"],
                    "location": class_item["location"],
                    "spotsOpen": class_item.get("spotsOpen", 0),
                },
            })

        return {
            "type": "suggestions",
            "message": f"Here's your personalized daily plan for {goal.lower()}! {workout_rec}",
            "suggestions": suggestions,
            "planData": {
                "workouts": [s for s in suggestions if s["kind"] == "workout"],
                "meals": [s for s in suggestions if s["kind"] == "meal"],
                "classes": [s for s in suggestions if s["kind"] == "class"],
            },
        }

    async def _generate_replan_suggestions(
        self, user_profile: Optional[Dict[str, Any]], weather_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate replan suggestions"""
        return await self._generate_personalized_daily_plan(user_profile, weather_data, [])

    async def _generate_personalized_workout_suggestions(
        self,
        user_profile: Optional[Dict[str, Any]],
        weather_data: Dict[str, Any],
        recent_topics: List[str],
    ) -> Dict[str, Any]:
        """Generate personalized workout suggestions"""
        workout_rec = self.weather_service.get_workout_recommendation(weather_data)
        time_prefs = user_profile.get("timePrefs", []) if user_profile else ["evening"]
        goal = user_profile.get("primaryGoal", "") if user_profile else ""

        now = datetime.now()
        suggestions = []

        # Determine workout type based on goal and weather
        if "strength" in goal.lower() or "muscle" in goal.lower():
            workout_type = "strength"
            title = "Strength Training Session"
        elif "cardio" in goal.lower() or "endurance" in goal.lower():
            workout_type = "cardio"
            title = "Cardio Workout"
        else:
            workout_type = "mixed"
            title = "Full Body Workout"

        if weather_data.get("recommendation") == "outdoor" and workout_type == "cardio":
            title = "Outdoor Running"
            workout_type = "cardio"

        for time_pref in time_prefs[:2]:  # Max 2 time preferences
            if time_pref == "morning":
                start = now.replace(hour=7, minute=0, second=0, microsecond=0)
            elif time_pref == "afternoon":
                start = now.replace(hour=14, minute=0, second=0, microsecond=0)
            else:  # evening
                start = now.replace(hour=18, minute=0, second=0, microsecond=0)

            suggestions.append({
                "id": f"w_{time_pref}",
                "kind": "workout",
                "title": title,
                "desc": workout_rec,
                "cta": "Add to Calendar",
                "payload": {
                    "startISO": start.isoformat(),
                    "endISO": (start + timedelta(minutes=45)).isoformat(),
                    "type": workout_type,
                },
            })

        return {
            "type": "suggestions",
            "message": workout_rec,
            "suggestions": suggestions,
        }

    async def _generate_class_suggestions(
        self, user_profile: Optional[Dict[str, Any]], recent_topics: List[str]
    ) -> Dict[str, Any]:
        """Generate class suggestions from MyRec"""
        classes = await self.myrec_provider.search()
        suggestions = []

        for class_item in classes[:5]:  # Top 5 classes
            suggestions.append({
                "id": class_item["id"],
                "kind": "class",
                "title": class_item["title"],
                "desc": f"{class_item.get('location', 'Duke Recreation')} - {class_item.get('spotsOpen', 0)} spots available",
                "cta": "Reserve Spot",
                "payload": {
                    "startISO": class_item["start"],
                    "endISO": class_item["end"],
                    "location": class_item.get("location", ""),
                    "spotsOpen": class_item.get("spotsOpen", 0),
                },
            })

        return {
            "type": "suggestions",
            "message": f"Here are available classes at Duke Recreation!",
            "suggestions": suggestions,
        }

    def _generate_personalized_meal_suggestions(
        self, user_profile: Optional[Dict[str, Any]], recent_topics: List[str]
    ) -> Dict[str, Any]:
        """Generate personalized meal suggestions"""
        diet_prefs = user_profile.get("dietPrefs", []) if user_profile else []
        goal = user_profile.get("primaryGoal", "") if user_profile else ""

        meals = self._get_meal_suggestions_for_preferences(diet_prefs, goal)
        suggestions = []

        for meal in meals:
            suggestions.append({
                "id": meal["id"],
                "kind": "meal",
                "title": meal["title"],
                "desc": meal["desc"],
                "cta": "Log Meal",
                "payload": meal["payload"],
            })

        return {
            "type": "suggestions",
            "message": f"Here are some meal ideas that match your preferences!",
            "suggestions": suggestions,
        }

    def _get_meal_for_preferences(self, diet_prefs: List[str], goal: str) -> Dict[str, Any]:
        """Get meal suggestion based on dietary preferences"""
        meals = self._get_meal_suggestions_for_preferences(diet_prefs, goal)
        return meals[0] if meals else {
            "id": "m1",
            "kind": "meal",
            "title": "Balanced Meal",
            "desc": "A healthy, balanced option",
            "cta": "Log Meal",
            "payload": {"kcal": 500, "protein": 30},
        }

    def _get_meal_suggestions_for_preferences(self, diet_prefs: List[str], goal: str) -> List[Dict[str, Any]]:
        """Get multiple meal suggestions"""
        meals = []

        # Vegetarian options
        if "Vegetarian" in diet_prefs or "Vegan" in diet_prefs:
            meals.extend([
                {
                    "id": "m_veg1",
                    "title": "Quinoa Buddha Bowl",
                    "desc": "Quinoa, roasted vegetables, tahini dressing",
                    "payload": {"kcal": 450, "protein": 18, "carbs": 65, "fat": 12},
                },
                {
                    "id": "m_veg2",
                    "title": "Chickpea Curry",
                    "desc": "Protein-rich curry with brown rice",
                    "payload": {"kcal": 520, "protein": 22, "carbs": 75, "fat": 15},
                },
            ])

        # High protein for fitness goals
        if "fitness" in goal.lower() or "strength" in goal.lower():
            meals.append({
                "id": "m_protein1",
                "title": "Grilled Chicken with Sweet Potato",
                "desc": "High protein, balanced macros",
                "payload": {"kcal": 580, "protein": 45, "carbs": 55, "fat": 18},
            })

        # Default balanced meal
        if not meals:
            meals.append({
                "id": "m_balanced",
                "title": "Salmon with Quinoa and Vegetables",
                "desc": "Balanced macros, omega-3 rich",
                "payload": {"kcal": 520, "protein": 35, "carbs": 50, "fat": 20},
            })

        return meals

    def _generate_workout_suggestions_simple(self) -> List[Dict[str, Any]]:
        """Generate simple workout suggestions"""
        now = datetime.now()
        start = now.replace(hour=18, minute=0, second=0, microsecond=0)
        return [
            {
                "id": "w_simple",
                "kind": "workout",
                "title": "Evening Workout",
                "desc": "45-minute session",
                "cta": "Add to Calendar",
                "payload": {
                    "startISO": start.isoformat(),
                    "endISO": (start + timedelta(minutes=45)).isoformat(),
                },
            },
        ]

