from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import os
import json
import logging
import re

from openai import OpenAI

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are BlueWell's AI wellness coach. Provide empathetic, practical guidance rooted in the user's personal goals and survey data. Assume messages might contain typos or missing words—infer the intended meaning when it is safe to do so.
Always acknowledge relevant profile facts (goal, diet preferences, time availability, activity patterns) when answering.
Respond in JSON with this shape:
{
  "type": "message" | "suggestions",
  "message": "concise response (<=3 sentences, no medical advice)",
  "suggestions": [
    {
      "id": "string identifier",
      "kind": "workout" | "meal" | "class",
      "title": "short actionable title",
      "desc": "why it helps relative to the user's goals/preferences",
      "cta": "Add to Calendar | Log Meal | Reserve Spot | Try This",
      "payload": {
        "startISO": "ISO datetime if scheduling",
        "endISO": "ISO datetime if scheduling",
        "kcal": number,
        "protein": number,
        "...": "any helpful structured data"
      }
    }
  ]
}
Rules:
- Keep tone encouraging, never clinical, and avoid medical diagnoses.
- Mention how advice ties back to the user's stated goals or survey answers.
- Avoid repeating the same template twice in a row—ground every suggestion in the persona (goal, diet, time budget, schedule consistency).
- Suggest at most three concrete actions; omit suggestions when a message is enough.
- When describing workouts, list concrete exercises with sets/reps (e.g., "Squats 3x10, Push-ups 3x12").
- When you lack the info to answer, say so plainly and list topics you can help with (workouts, meals, Duke classes, planning, progress).
- If `dukeRecClasses` context is provided, share the top matching classes with titles, start times, and locations before suggesting other actions.
- If you reference scheduling, include ISO timestamps so the app can add items to the calendar.
- Use ISO 8601 datetimes whenever providing times.
- If information is missing, state that gently instead of guessing.
""".strip()

MAX_CHAT_HISTORY = 6


class EnhancedLLMProvider:
    """Enhanced LLM provider with natural language understanding and personalized responses"""

    def __init__(self) -> None:
        self.model = os.getenv("CHATBOT_MODEL", "gpt-4o-mini")
        api_key = os.getenv("OPENAI_API_KEY")
        self.client: Optional[OpenAI] = None
        if api_key:
            try:
                self.client = OpenAI(api_key=api_key)
            except Exception as exc:  # pragma: no cover - defensive log
                logger.warning("Failed to initialize OpenAI client: %s", exc)

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
        
        # Try LLM-backed response first
        llm_response = self._call_llm(
            message=message,
            user_profile=user_profile or {},
            conversation_history=conversation_history or [],
            extra_context=context or {},
            recent_context=recent_context,
        )
        if llm_response:
            return llm_response
        
        # Natural language understanding - handle questions and requests
        response = self._understand_intent(message_lower, user_profile, recent_context)
        
        return response

    def _call_llm(
        self,
        message: str,
        user_profile: Dict[str, Any],
        conversation_history: List[Dict[str, str]],
        extra_context: Dict[str, Any],
        recent_context: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Call OpenAI to craft a personalized response. Returns None if unavailable."""
        if not self.client:
            return None

        messages: List[Dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]

        for turn in (conversation_history or [])[-MAX_CHAT_HISTORY:]:
            role = turn.get("role")
            content = turn.get("content")
            if role in {"user", "assistant"} and content:
                messages.append({"role": role, "content": content})

        user_prompt = self._build_user_prompt(message, user_profile, extra_context, recent_context)
        messages.append({"role": "user", "content": user_prompt})

        try:
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.35,
                max_tokens=700,
                response_format={"type": "json_object"},
            )
            content = completion.choices[0].message.content if completion.choices else None
            if not content:
                return None
            payload = json.loads(content)
            return self._normalize_llm_payload(payload, user_profile)
        except Exception as exc:  # pragma: no cover - network/service errors
            logger.warning("LLM chat failed, falling back to rule-based response: %s", exc)
            return None

    def _build_user_prompt(
        self,
        latest_message: str,
        user_profile: Dict[str, Any],
        extra_context: Dict[str, Any],
        recent_context: Dict[str, Any],
    ) -> str:
        """Compose the user-visible prompt for the LLM."""
        profile_summary = self._format_user_profile(user_profile)
        trimmed_context = None
        if extra_context:
            trimmed_context = {
                k: v
                for k, v in extra_context.items()
                if k not in {"targets", "surveyAnswers", "dukeRecClasses"}
            }
        targets_summary = self._format_targets(extra_context)
        survey_summary = self._summarize_survey_answers(extra_context)
        classes_summary = self._summarize_duke_classes(extra_context)
        remaining_context = self._format_context(trimmed_context)
        topics = ", ".join(sorted(set(recent_context.get("topics", [])))) or "none noted"

        return (
            f"Latest user question:\n{latest_message.strip()}\n\n"
            f"User profile details (from onboarding/survey):\n{profile_summary}\n\n"
            f"Daily targets & constraints:\n{targets_summary}\n\n"
            f"Survey highlights:\n{survey_summary}\n\n"
            f"Duke Rec data:\n{classes_summary}\n\n"
            f"Other app context:\n{remaining_context}\n\n"
            f"Recent conversation topics: {topics}\n\n"
            "Craft a helpful response that explicitly references the user's goals or preferences when relevant. "
            "Return JSON as instructed in the system prompt."
        )

    def _format_user_profile(self, profile: Dict[str, Any]) -> str:
        """Turn the stored profile into readable bullet points for the prompt."""
        if not profile:
            return "No profile data provided."

        def stringify(value: Any) -> str:
            if isinstance(value, list):
                return ", ".join(str(item) for item in value if item)
            if isinstance(value, (int, float)):
                return str(value)
            return str(value) if value not in (None, "", "null") else ""

        lines = []
        mappings = {
            "primaryGoal": "Primary goal",
            "weeklyWorkouts": "Weekly workout target",
            "dietPrefs": "Diet preferences",
            "allergies": "Allergies",
            "timePrefs": "Preferred workout times",
            "reminderPref": "Reminder style",
            "scheduleCons": "Schedule consistency score",
            "mealRegular": "Meal regularity score",
            "timeBudgetMin": "Time budget (minutes/day)",
            "heightCm": "Height (cm)",
            "weightKg": "Weight (kg)",
            "gender": "Gender",
            "age": "Age",
            "weeklyActivity": "Weekly activity rating",
            "calorieBudget": "Calorie budget",
            "proteinTarget": "Protein target (g)",
            "avoidFoods": "Foods to avoid",
        }

        for key, label in mappings.items():
            value = profile.get(key)
            text = stringify(value)
            if text:
                lines.append(f"- {label}: {text}")

        return "\n".join(lines) if lines else "Profile present but missing key goal data."

    def _format_context(self, context: Dict[str, Any]) -> str:
        """Format auxiliary context for the prompt."""
        if not context:
            return "No extra context."

        try:
            return json.dumps(context, ensure_ascii=False)
        except TypeError:
            return str(context)

    def _format_targets(self, context: Optional[Dict[str, Any]]) -> str:
        if not context:
            return "Not provided."
        targets = context.get("targets")
        if not isinstance(targets, dict):
            return "Not provided."
        calorie = targets.get("calorieBudget")
        protein = targets.get("proteinTarget")
        notes = []
        if calorie:
            notes.append(f"- Daily calorie target: {calorie} kcal")
        if protein:
            notes.append(f"- Daily protein target: {protein} g")
        return "\n".join(notes) if notes else "Targets provided but values missing."

    def _summarize_survey_answers(self, context: Optional[Dict[str, Any]]) -> str:
        if not context:
            return "No survey answers available."
        answers = context.get("surveyAnswers")
        if not isinstance(answers, list) or not answers:
            return "No survey answers available."
        highlights = []
        for entry in answers[:6]:
            label = entry.get("label") or entry.get("questionId")
            answer = entry.get("answer")
            text = ""
            if isinstance(answer, list):
                text = ", ".join(str(item) for item in answer if item)
            elif isinstance(answer, dict):
                text = ", ".join(f"{k}: {v}" for k, v in answer.items())
            else:
                text = str(answer)
            if text:
                highlights.append(f"- {label}: {text}")
        return "\n".join(highlights) if highlights else "Survey answers captured but unparsable."

    def _summarize_duke_classes(self, context: Optional[Dict[str, Any]]) -> str:
        if not context:
            return "No Duke Rec data provided."
        data = context.get("dukeRecClasses")
        if not isinstance(data, dict):
            return "No Duke Rec data provided."
        items = data.get("items")
        if not isinstance(items, list) or not items:
            return f"No Duke Rec classes returned for {data.get('timeframe', 'requested window')}."

        summaries = []
        for entry in items[:6]:
            title = entry.get("title", "Class")
            location = entry.get("location", "")
            start_iso = entry.get("start") or entry.get("startISO")
            try:
                start_pretty = datetime.fromisoformat(start_iso).strftime("%a %I:%M %p") if start_iso else "TBA"
            except Exception:
                start_pretty = start_iso or "TBA"
            spots = entry.get("spotsOpen")
            descriptor = f"- {title} at {start_pretty}"
            if location:
                descriptor += f" ({location})"
            if spots is not None:
                descriptor += f" – {spots} spots left"
            summaries.append(descriptor)

        label = data.get("timeframe", "requested window")
        return f"Classes for {label}:\n" + "\n".join(summaries)

    def _normalize_llm_payload(self, payload: Dict[str, Any], user_profile: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure the LLM output matches the ChatResponse schema."""
        chat_type = payload.get("type", "message")
        message = payload.get("message") or "I'm here to help keep you on track today."
        raw_suggestions = payload.get("suggestions")

        suggestions: List[Dict[str, Any]] = []
        if isinstance(raw_suggestions, list):
            allowed_kinds = {"workout", "meal", "class"}
            for idx, suggestion in enumerate(raw_suggestions, start=1):
                if not isinstance(suggestion, dict):
                    continue
                kind = suggestion.get("kind", "workout")
                if kind not in allowed_kinds:
                    kind = "workout"
                normalized = {
                    "id": suggestion.get("id") or f"s{idx}",
                    "kind": kind,
                    "title": suggestion.get("title") or "Try This",
                    "desc": suggestion.get("desc") or "",
                    "cta": suggestion.get("cta") or "Learn More",
                    "payload": suggestion.get("payload") or {},
                }
                suggestions.append(self._enrich_suggestion(normalized, user_profile))

        if chat_type == "suggestions" and not suggestions:
            chat_type = "message"

        if suggestions:
            message = self._compose_text_from_suggestions(message, suggestions)
            suggestions = None
            chat_type = "message"

        return {
            "type": chat_type,
            "message": message,
            "suggestions": suggestions or None,
        }

    def _enrich_suggestion(self, suggestion: Dict[str, Any], user_profile: Dict[str, Any]) -> Dict[str, Any]:
        """Fill in missing payload data so UI actions always work."""
        payload = suggestion.get("payload") or {}
        kind = suggestion.get("kind")
        now = datetime.now()

        def preferred_start() -> datetime:
            prefs = user_profile.get("timePrefs") or []
            base = now
            if prefs:
                pref = prefs[0]
                hour = {"morning": 7, "afternoon": 14, "evening": 18}.get(pref, now.hour)
                return now.replace(hour=hour, minute=0, second=0, microsecond=0)
            return now

        if kind in {"workout", "class"}:
            if "startISO" not in payload or "endISO" not in payload:
                start = preferred_start()
                duration = 45 if kind == "workout" else 60
                payload.setdefault("startISO", start.isoformat())
                payload.setdefault("endISO", (start + timedelta(minutes=duration)).isoformat())
        if kind == "workout" and not suggestion.get("desc"):
            suggestion["desc"] = self._build_workout_detail(user_profile)
        elif kind == "meal":
            payload.setdefault("kcal", 500)
            payload.setdefault("protein", 30)

        suggestion["payload"] = payload
        return suggestion

    def _build_workout_detail(self, user_profile: Dict[str, Any]) -> str:
        goal = (user_profile.get("primaryGoal") or user_profile.get("fitnessGoal") or "fitness").lower()
        time_budget = user_profile.get("timeBudgetMin") or 30
        blocks = ["5-min brisk walk warm-up"]
        if "strength" in goal or "muscle" in goal:
            blocks.append("3x10 bodyweight squats")
            blocks.append("3x12 push-ups or kneeling push-ups")
        elif "lose" in goal or "fat" in goal:
            blocks.append("10-min light jog or bike at RPE 5/10")
            blocks.append("3x12 alternating lunges")
        else:
            blocks.append("3x12 glute bridges + 3x30s plank holds")
        blocks.append("5-min full-body stretch")
        return f"~{time_budget} min: " + "; ".join(blocks)

    def _compose_text_from_suggestions(self, intro: str, suggestions: List[Dict[str, Any]]) -> str:
        lines: List[str] = []
        if intro.strip():
            lines.append(intro.strip())
        for suggestion in suggestions:
            title = suggestion.get("title", suggestion.get("kind", "Suggestion").title())
            desc = suggestion.get("desc", "")
            payload = suggestion.get("payload") or {}
            start_label = self._format_time_label(payload.get("startISO"))
            detail_parts = []
            if start_label != "any time today":
                detail_parts.append(start_label)
            if payload.get("location"):
                detail_parts.append(payload["location"])
            detail = " • ".join(detail_parts)
            base = f"- {title}"
            if detail:
                base += f" ({detail})"
            if desc:
                base += f": {desc}"
            lines.append(base)
        lines.append("Need tweaks or a different option? Just let me know.")
        return "\n".join(lines)

    def _format_time_label(self, iso_str: Optional[str]) -> str:
        if not iso_str:
            return "any time today"
        try:
            dt = datetime.fromisoformat(iso_str)
            return dt.strftime("%a %I:%M %p").lstrip("0")
        except Exception:
            return "any time today"

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
        topics = ["workouts", "meals", "Duke Rec classes", "daily plans", "progress nudges"]
        return {
            "type": "message",
            "message": f"I may not have data for that yet, but I can help with {', '.join(topics)}. Which area should we focus on?",
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
