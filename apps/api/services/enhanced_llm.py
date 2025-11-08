from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import re


class EnhancedLLMProvider:
    """Enhanced LLM provider with natural language understanding and personalized responses"""

    def generate(
        self,
        message: str,
        user_profile: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Generate natural language response based on message, user profile, and conversation history"""
        message_lower = message.lower().strip()
        
        # Analyze conversation history for context
        recent_context = self._analyze_conversation_history(conversation_history or [])
        
        # Natural language understanding - handle questions and requests
        response = self._understand_intent(message_lower, user_profile, recent_context)
        
        return response

    def _analyze_conversation_history(self, history: List[Dict[str, str]]) -> Dict[str, Any]:
        """Extract context from conversation history"""
        context = {
            "topics": [],
            "last_intent": None,
            "mentioned_items": [],
        }
        
        for msg in history[-5:]:  # Last 5 messages
            content = msg.get("content", "").lower()
            
            # Extract topics
            if any(word in content for word in ["workout", "exercise", "training", "fitness"]):
                context["topics"].append("workout")
            if any(word in content for word in ["meal", "food", "eat", "dinner", "lunch", "breakfast"]):
                context["topics"].append("meal")
            if any(word in content for word in ["class", "myrec", "schedule", "reserve"]):
                context["topics"].append("class")
            if any(word in content for word in ["plan", "daily", "today", "schedule"]):
                context["topics"].append("plan")
        
        return context

    def _understand_intent(
        self, message: str, user_profile: Optional[Dict[str, Any]], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Understand user intent and generate appropriate response"""
        
        # Greetings and general questions
        if any(word in message for word in ["hi", "hello", "hey", "how are you"]):
            return {
                "type": "message",
                "message": self._get_personalized_greeting(user_profile) + "How can I help you today?",
            }
        
        # Questions about workouts
        if any(word in message for word in ["workout", "exercise", "training", "fitness", "gym"]):
            return self._handle_workout_questions(message, user_profile, context)
        
        # Questions about meals/food
        if any(word in message for word in ["meal", "food", "eat", "dinner", "lunch", "breakfast", "hungry", "what should i eat"]):
            return self._handle_meal_questions(message, user_profile, context)
        
        # Questions about classes
        if any(word in message for word in ["class", "myrec", "schedule", "reserve", "available"]):
            return self._handle_class_questions(message, user_profile, context)
        
        # Questions about plans/schedule
        if any(word in message for word in ["plan", "daily", "today", "schedule", "what should i do"]):
            return self._handle_plan_questions(message, user_profile, context)
        
        # Questions about progress/goals
        if any(word in message for word in ["progress", "goal", "how am i doing", "stats", "summary"]):
            return {
                "type": "message",
                "message": "I can help you track your progress! Check out your weekly summary to see your workouts, calories burned, and achievements. Would you like me to suggest a workout to help you reach your goals?",
            }
        
        # Questions about calories/nutrition
        if any(word in message for word in ["calorie", "calories", "nutrition", "protein", "carbs", "macro"]):
            return self._handle_nutrition_questions(message, user_profile, context)
        
        # Time-based questions
        if any(word in message for word in ["when", "what time", "schedule", "today", "tomorrow"]):
            return self._handle_time_questions(message, user_profile, context)
        
        # How/what/why questions
        if message.startswith(("how", "what", "why", "where", "can", "should", "do you")):
            return self._handle_general_questions(message, user_profile, context)
        
        # Default - friendly response with suggestions
        return {
            "type": "message",
            "message": "I'm here to help you with workouts, meals, classes, and daily planning! You can ask me things like:\n• \"What workout should I do today?\"\n• \"Suggest a meal for dinner\"\n• \"Find me a class\"\n• \"What's my plan for today?\"\n\nWhat would you like help with?",
        }

    def _get_personalized_greeting(self, profile: Optional[Dict[str, Any]]) -> str:
        """Get personalized greeting"""
        if not profile:
            return "Hi! "
        name = profile.get("name") or ""
        if name:
            return f"Hi {name}! "
        goal = profile.get("primaryGoal", "")
        if goal:
            return f"Hi! I see you're working on {goal.lower()}. "
        return "Hi! "

    def _handle_workout_questions(
        self, message: str, user_profile: Optional[Dict[str, Any]], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle workout-related questions"""
        goal = user_profile.get("primaryGoal", "") if user_profile else ""
        time_prefs = user_profile.get("timePrefs", []) if user_profile else ["evening"]
        
        # Questions about what workout to do
        if any(word in message for word in ["what", "suggest", "recommend", "should i do"]):
            suggestions = self._generate_workout_suggestions(user_profile, time_prefs)
            workout_type = "strength" if "strength" in goal.lower() else "cardio" if "cardio" in goal.lower() else "mixed"
            
            response_msg = f"Based on your goal of {goal or 'general fitness'}, I recommend a {workout_type} workout"
            if time_prefs:
                response_msg += f" in the {time_prefs[0]}"
            response_msg += "!"
            
            return {
                "type": "suggestions",
                "message": response_msg,
                "suggestions": suggestions,
            }
        
        # Questions about when to workout
        if any(word in message for word in ["when", "time", "schedule"]):
            if time_prefs:
                best_time = time_prefs[0]
                return {
                    "type": "message",
                    "message": f"Based on your preferences, {best_time} workouts work best for you! Would you like me to suggest a specific workout for that time?",
                    "suggestions": self._generate_workout_suggestions(user_profile, [best_time]),
                }
            return {
                "type": "message",
                "message": "I can help you schedule workouts! What time of day works best for you?",
            }
        
        # Default workout response
        return {
            "type": "suggestions",
            "message": "Here are some workout suggestions for you!",
            "suggestions": self._generate_workout_suggestions(user_profile, time_prefs),
        }

    def _handle_meal_questions(
        self, message: str, user_profile: Optional[Dict[str, Any]], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle meal-related questions"""
        diet_prefs = user_profile.get("dietPrefs", []) if user_profile else []
        goal = user_profile.get("primaryGoal", "") if user_profile else ""
        
        # Questions about what to eat
        if any(word in message for word in ["what", "suggest", "recommend", "should i eat", "hungry"]):
            suggestions = self._generate_meal_suggestions(diet_prefs, goal)
            pref_text = ", ".join(diet_prefs) if diet_prefs else "your preferences"
            
            return {
                "type": "suggestions",
                "message": f"Here are some meal ideas that match {pref_text}!",
                "suggestions": suggestions,
            }
        
        # Questions about calories/nutrition
        if any(word in message for word in ["calorie", "nutrition", "healthy", "protein"]):
            return {
                "type": "message",
                "message": "I can help you find nutritious meals! Would you like high-protein options, low-calorie meals, or something balanced?",
                "suggestions": self._generate_meal_suggestions(diet_prefs, goal),
            }
        
        # Default meal response
        return {
            "type": "suggestions",
            "message": "Here are some meal suggestions for you!",
            "suggestions": self._generate_meal_suggestions(diet_prefs, goal),
        }

    def _handle_class_questions(
        self, message: str, user_profile: Optional[Dict[str, Any]], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle class-related questions"""
        # Questions about finding classes
        if any(word in message for word in ["find", "available", "what classes", "show me"]):
            suggestions = self._generate_class_suggestions()
            return {
                "type": "suggestions",
                "message": "Here are available classes you can join!",
                "suggestions": suggestions,
            }
        
        # Default class response
        return {
            "type": "suggestions",
            "message": "I can help you find classes! Here are some options:",
            "suggestions": self._generate_class_suggestions(),
        }

    def _handle_plan_questions(
        self, message: str, user_profile: Optional[Dict[str, Any]], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle plan/schedule questions"""
        goal = user_profile.get("primaryGoal", "") if user_profile else "general fitness"
        time_prefs = user_profile.get("timePrefs", []) if user_profile else ["morning", "evening"]
        
        suggestions = self._generate_daily_plan_suggestions(user_profile, time_prefs)
        
        return {
            "type": "suggestions",
            "message": f"Here's your personalized plan for today to help you reach your {goal} goal!",
            "suggestions": suggestions,
        }

    def _handle_nutrition_questions(
        self, message: str, user_profile: Optional[Dict[str, Any]], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle nutrition-related questions"""
        return {
            "type": "message",
            "message": "I can help you with nutrition! You can log meals by taking photos, and I'll estimate calories and macros. Would you like meal suggestions that match your dietary preferences?",
            "suggestions": self._generate_meal_suggestions(
                user_profile.get("dietPrefs", []) if user_profile else [], 
                user_profile.get("primaryGoal", "") if user_profile else ""
            ),
        }

    def _handle_time_questions(
        self, message: str, user_profile: Optional[Dict[str, Any]], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle time-based questions"""
        time_prefs = user_profile.get("timePrefs", []) if user_profile else []
        
        if "workout" in context.get("topics", []):
            if time_prefs:
                return {
                    "type": "message",
                    "message": f"Based on your preferences, {time_prefs[0]} is a great time for workouts!",
                    "suggestions": self._generate_workout_suggestions(user_profile, [time_prefs[0]]),
                }
        
        return {
            "type": "message",
            "message": "I can help you schedule activities! What would you like to plan?",
        }

    def _handle_general_questions(
        self, message: str, user_profile: Optional[Dict[str, Any]], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle general how/what/why questions"""
        # Questions about capabilities
        if any(word in message for word in ["can you", "what can you", "how can you", "do you"]):
            return {
                "type": "message",
                "message": "I can help you with:\n• Workout recommendations based on your goals\n• Meal suggestions matching your dietary preferences\n• Finding and reserving fitness classes\n• Creating daily plans\n• Tracking your progress\n\nWhat would you like help with?",
            }
        
        # Questions about how to use features
        if "how" in message:
            if "log" in message or "meal" in message:
                return {
                    "type": "message",
                    "message": "To log a meal, go to the Log page and take a photo of your food. I'll automatically estimate the calories and nutrition!",
                }
            if "workout" in message:
                return {
                    "type": "message",
                    "message": "You can add workouts to your calendar, and I'll track them automatically. Or ask me to suggest a workout based on your goals!",
                }
        
        # Default response for general questions
        return {
            "type": "message",
            "message": "I'm here to help! You can ask me about workouts, meals, classes, or your daily plan. What would you like to know?",
        }

    def _generate_workout_suggestions(
        self, user_profile: Optional[Dict[str, Any]], time_prefs: List[str]
    ) -> List[Dict[str, Any]]:
        """Generate workout suggestions"""
        now = datetime.now()
        goal = user_profile.get("primaryGoal", "") if user_profile else ""
        
        suggestions = []
        for i, time_pref in enumerate(time_prefs[:2]):  # Max 2 suggestions
            if time_pref == "morning":
                start = now.replace(hour=7, minute=0, second=0, microsecond=0)
            elif time_pref == "afternoon":
                start = now.replace(hour=14, minute=0, second=0, microsecond=0)
            else:  # evening
                start = now.replace(hour=18, minute=0, second=0, microsecond=0)
            
            # Determine workout type based on goal
            if "strength" in goal.lower() or "muscle" in goal.lower():
                title = "Strength Training"
                workout_type = "strength"
            elif "cardio" in goal.lower() or "endurance" in goal.lower():
                title = "Cardio Workout"
                workout_type = "cardio"
            else:
                title = "Full Body Workout"
                workout_type = "mixed"
            
            suggestions.append({
                "id": f"w_{i}",
                "kind": "workout",
                "title": title,
                "desc": f"45-minute {workout_type} session",
                "cta": "Add to Calendar",
                "payload": {
                    "startISO": start.isoformat(),
                    "endISO": (start + timedelta(minutes=45)).isoformat(),
                    "type": workout_type,
                    "duration": 45,
                },
            })
        
        return suggestions if suggestions else [{
            "id": "w1",
            "kind": "workout",
            "title": "Evening Workout",
            "desc": "45-minute full body session",
            "cta": "Add to Calendar",
            "payload": {
                "startISO": now.replace(hour=18, minute=0, second=0, microsecond=0).isoformat(),
                "endISO": (now.replace(hour=18, minute=0, second=0, microsecond=0) + timedelta(minutes=45)).isoformat(),
            },
        }]

    def _generate_meal_suggestions(
        self, diet_prefs: List[str], goal: str
    ) -> List[Dict[str, Any]]:
        """Generate meal suggestions"""
        suggestions = []
        
        if "Vegetarian" in diet_prefs or "Vegan" in diet_prefs:
            suggestions.append({
                "id": "m1",
                "kind": "meal",
                "title": "Quinoa Buddha Bowl",
                "desc": "Roasted vegetables, tahini dressing",
                "cta": "Log Meal",
                "payload": {"kcal": 450, "protein": 18},
            })
        
        if "fitness" in goal.lower() or "strength" in goal.lower():
            suggestions.append({
                "id": "m2",
                "kind": "meal",
                "title": "Grilled Chicken with Sweet Potato",
                "desc": "High protein, balanced macros",
                "cta": "Log Meal",
                "payload": {"kcal": 580, "protein": 45},
            })
        
        if not suggestions:
            suggestions.append({
                "id": "m1",
                "kind": "meal",
                "title": "Salmon with Quinoa",
                "desc": "Balanced nutrition",
                "cta": "Log Meal",
                "payload": {"kcal": 520, "protein": 35},
            })
        
        return suggestions

    def _generate_class_suggestions(self) -> List[Dict[str, Any]]:
        """Generate class suggestions"""
        now = datetime.now()
        start = now.replace(hour=19, minute=0, second=0, microsecond=0)
        
        return [
            {
                "id": "c1",
                "kind": "class",
                "title": "HIIT Class",
                "desc": "High-intensity interval training",
                "cta": "Reserve Spot",
                "payload": {
                    "startISO": start.isoformat(),
                    "endISO": (start + timedelta(hours=1)).isoformat(),
                    "location": "Fitness Center",
                },
            },
        ]

    def _generate_daily_plan_suggestions(
        self, user_profile: Optional[Dict[str, Any]], time_prefs: List[str]
    ) -> List[Dict[str, Any]]:
        """Generate daily plan suggestions"""
        now = datetime.now()
        suggestions = []
        
        # Workout
        if time_prefs:
            workout_time = time_prefs[0]
            if workout_time == "morning":
                start = now.replace(hour=7, minute=0, second=0, microsecond=0)
            elif workout_time == "afternoon":
                start = now.replace(hour=14, minute=0, second=0, microsecond=0)
            else:
                start = now.replace(hour=18, minute=0, second=0, microsecond=0)
            
            suggestions.append({
                "id": "w1",
                "kind": "workout",
                "title": f"{workout_time.capitalize()} Workout",
                "desc": "45-minute session",
                "cta": "Add to Calendar",
                "payload": {
                    "startISO": start.isoformat(),
                    "endISO": (start + timedelta(minutes=45)).isoformat(),
                },
            })
        
        # Meal
        suggestions.append({
            "id": "m1",
            "kind": "meal",
            "title": "Balanced Meal",
            "desc": "High protein, nutritious",
            "cta": "Log Meal",
            "payload": {"kcal": 500, "protein": 30},
        })
        
        # Class
        class_start = now.replace(hour=19, minute=0, second=0, microsecond=0)
        suggestions.append({
            "id": "c1",
            "kind": "class",
            "title": "Evening Fitness Class",
            "desc": "Group training session",
            "cta": "Reserve Spot",
            "payload": {
                "startISO": class_start.isoformat(),
                "endISO": (class_start + timedelta(hours=1)).isoformat(),
            },
        })
        
        return suggestions

