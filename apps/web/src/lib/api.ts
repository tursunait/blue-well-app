const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://localhost:8000";

export async function chatRequest(message: string, context?: Record<string, any>) {
  const response = await fetch(`${FASTAPI_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, context }),
  });
  if (!response.ok) throw new Error("Chat request failed");
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

