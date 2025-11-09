const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || "http://localhost:8000";
const CALORIE_ESTIMATOR_BASE_URL = process.env.NEXT_PUBLIC_CALORIE_ESTIMATOR_URL || "http://localhost:8001";

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

// Response types for calorie estimation
export interface NutritionInfo {
  calories: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
}

export interface CalorieEstimateItem {
  dish_name: string;
  estimated_calories: number;
  nutrition: NutritionInfo;
  confidence: number;
  rationale: string;
}

export interface CalorieEstimateResponse {
  items: CalorieEstimateItem[];
  total_calories: number;
  model_used: string;
  images_processed: number;
}

export async function estimateCalories(
  imageFiles: File[],
  hint?: string,
  plateDiameterCm?: number
): Promise<CalorieEstimateResponse> {
  const formData = new FormData();

  // Append all images
  imageFiles.forEach((file) => {
    formData.append("images", file);
  });

  // Append optional parameters
  if (hint) {
    formData.append("hint", hint);
  }
  if (plateDiameterCm) {
    formData.append("plate_diameter_cm", plateDiameterCm.toString());
  }

  const response = await fetch(`${CALORIE_ESTIMATOR_BASE_URL}/v1/estimate-calories`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Calorie estimation failed");
  }

  return response.json();
}

export async function estimateCaloriesFromText(
  foodDescription: string
): Promise<CalorieEstimateResponse> {
  const formData = new FormData();
  formData.append("food_description", foodDescription);

  const response = await fetch(`${CALORIE_ESTIMATOR_BASE_URL}/v1/estimate-calories-text`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Calorie estimation failed");
  }

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

