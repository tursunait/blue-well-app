const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://localhost:8000";

export async function chatRequest(
  message: string,
  context?: Record<string, any>,
  conversationHistory?: Array<{ role: string; content: string }>,
  userProfile?: Record<string, any>
) {
  const response = await fetch(`${FASTAPI_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      context,
      conversation_history: conversationHistory,
      user_profile: userProfile,
    }),
  });
  if (!response.ok) throw new Error("Chat request failed");
  return response.json();
}

export async function saveDailyPlan(date: string, planJson: Record<string, any>) {
  const response = await fetch(`${FASTAPI_BASE_URL}/planner/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ date, planJson }),
  });
  if (!response.ok) throw new Error("Failed to save plan");
  return response.json();
}

export async function emailDailyPlan(date: string, planJson: Record<string, any>) {
  const response = await fetch(`${FASTAPI_BASE_URL}/planner/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ date, planJson }),
  });
  if (!response.ok) throw new Error("Failed to email plan");
  return response.json();
}

export async function logWorkout(workout: {
  title: string;
  type?: string;
  duration: number;
  caloriesBurned?: number;
  notes?: string;
  date: string;
}) {
  const response = await fetch(`${FASTAPI_BASE_URL}/workouts/log`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(workout),
  });
  if (!response.ok) throw new Error("Failed to log workout");
  return response.json();
}

export async function getWeeklySummary(weekStart?: string) {
  const params = weekStart ? `?week_start=${weekStart}` : "";
  const response = await fetch(`${FASTAPI_BASE_URL}/workouts/summary${params}`);
  if (!response.ok) throw new Error("Failed to fetch summary");
  return response.json();
}

export async function estimateCalories(imageFile: File) {
  const formData = new FormData();
  formData.append("file", imageFile);
  const response = await fetch(`${FASTAPI_BASE_URL}/calorie/estimate`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) throw new Error("Calorie estimation failed");
  return response.json();
}

export async function getMyRecClasses(date?: string, location?: string, type?: string) {
  const params = new URLSearchParams();
  if (date) params.append("date", date);
  if (location) params.append("location", location);
  if (type) params.append("type", type);
  const response = await fetch(`${FASTAPI_BASE_URL}/myrec/classes?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch classes");
  return response.json();
}

export async function addCalendarEvent(event: {
  title: string;
  startISO: string;
  endISO: string;
  location?: string;
  notes?: string;
}) {
  const response = await fetch(`${FASTAPI_BASE_URL}/calendar/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });
  if (!response.ok) throw new Error("Failed to add calendar event");
  return response.json();
}

