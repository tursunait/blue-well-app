import { prisma } from "@/lib/prisma";
import { getUserContext } from "./planner-tools";
import { openai, withRetry } from "@/lib/ai";

const CHAT_MODEL = process.env.PLANNER_CHAT_MODEL || "gpt-4o-mini";
const DISABLE_AI_INSIGHTS = process.env.DISABLE_AI_INSIGHTS === "true";

export interface StatsInsights {
  summary?: string;
  recommendations?: string[];
  encouragement?: string;
}

/**
 * Generate AI-powered insights and recommendations based on today's stats
 */
export async function generateStatsInsights(
  userId: string,
  stats: {
    calories: { consumed: number; goal: number; remaining: number; burned: number };
    protein: { consumed: number; goal: number; remaining: number };
    steps: { current: number; goal: number; remaining: number };
    dietPrefs?: string[];
  }
): Promise<StatsInsights & { aiInsightsFallback?: boolean }> {
  // Feature flag to disable AI insights
  if (DISABLE_AI_INSIGHTS || !process.env.OPENAI_API_KEY) {
    return {
      summary: "AI insights are currently unavailable.",
      recommendations: [],
      encouragement: "Keep up the great work!",
      aiInsightsFallback: true,
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return {
        summary: "User profile not found.",
        recommendations: [],
        encouragement: "",
        aiInsightsFallback: true,
      };
    }

    const context = await getUserContext(userId);

    const systemPrompt = `You are a wellness coach providing personalized insights and recommendations based on a user's daily progress.

Analyze their progress and provide:
1. A brief summary of how they're doing today
2. 2-3 actionable recommendations based on their current progress
3. An encouraging message

Be supportive, specific, and actionable. Keep it concise.`;

    const dietPrefsText = stats.dietPrefs?.length ? stats.dietPrefs.join(", ") : context.dietPrefs.join(", ") || "None";

    const userPrompt = `Analyze today's progress for this user:

Fitness Goal: ${user.fitnessGoal || "MAINTAIN"}
Calories:
- Goal: ${stats.calories.goal} kcal
- Consumed: ${stats.calories.consumed} kcal
- Remaining: ${stats.calories.remaining} kcal
- Burned: ${stats.calories.burned} kcal

Protein:
- Goal: ${stats.protein.goal}g
- Consumed: ${stats.protein.consumed}g
- Remaining: ${stats.protein.remaining}g

Steps:
- Goal: ${stats.steps.goal} steps
- Current: ${stats.steps.current} steps
- Remaining: ${stats.steps.remaining} steps

User Profile:
- Activity level: ${context.weeklyActivity} days/week
- Time budget: ${context.timeBudgetMin} min/day
- Diet preferences: ${dietPrefsText}

Provide insights as JSON:
{
  "summary": "Brief summary of progress",
  "recommendations": ["recommendation 1", "recommendation 2"],
  "encouragement": "Encouraging message"
}`;

    // Use retry wrapper with timeout (10s max)
    const response = await Promise.race([
      withRetry(
        () =>
          openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
          }),
        { retries: 2, baseMs: 500 } // Reduced retries for faster fallback
      ),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("AI request timed out")), 10000);
      }),
    ]);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const insights = JSON.parse(content) as StatsInsights;
    return insights;
  } catch (error: any) {
    const is429 = error?.status === 429 || error?.code === "insufficient_quota" || error?.code === "rate_limit_exceeded";
    const errorType = is429 ? "quota/429" : error?.message || String(error);
    console.warn("[ai-insights] degraded mode:", errorType);

    // Return graceful fallback
    return {
      summary: "AI insights are temporarily unavailable. Check back later for personalized recommendations.",
      recommendations: [
        "Track your meals consistently to see progress",
        "Stay hydrated throughout the day",
        "Get enough sleep to support your wellness goals",
      ],
      encouragement: "You're doing great! Keep tracking your progress.",
      aiInsightsFallback: true,
    };
  }
}

