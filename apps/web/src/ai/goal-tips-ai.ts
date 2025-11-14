import OpenAI from "openai";
import { getUserContext } from "./planner-tools";
import { prisma } from "@/lib/prisma";

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. AI goal tips generation will fail.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CHAT_MODEL = process.env.PLANNER_CHAT_MODEL || "gpt-4o-mini";

/**
 * Generate personalized goal tips using AI
 * Based on user's specific profile, progress, and goals
 */
export async function generateGoalTipsWithAI(
  userId: string,
  fitnessGoal: string | null,
  context: Awaited<ReturnType<typeof getUserContext>>
): Promise<string[]> {
  if (!fitnessGoal) {
    return [];
  }

  // Get today's progress for context
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [foodLogs, activityLogs] = await Promise.all([
    prisma.foodLog.findMany({
      where: {
        userId,
        ts: { gte: todayStart, lte: todayEnd },
      },
    }).catch(() => []),
    prisma.activityLog.findMany({
      where: {
        userId,
        ts: { gte: todayStart, lte: todayEnd },
      },
    }).catch(() => []),
  ]);

  const caloriesConsumed = foodLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
  const proteinConsumed = foodLogs.reduce((sum, log) => sum + (log.proteinG || 0), 0);
  const caloriesBurned = activityLogs.reduce((sum, log) => sum + (log.kcalBurn || 0), 0);

  const systemPrompt = `You are a wellness coach providing personalized tips to help users achieve their fitness goals.

Generate 3-5 actionable, specific tips that are:
- Personalized to the user's current situation
- Practical and achievable
- Encouraging and supportive
- Based on their fitness goal, progress, and preferences

Tips should be concise (one sentence each) and actionable.`;

  const userPrompt = `Generate personalized tips for this user:

Fitness Goal: ${fitnessGoal}
Calorie Budget: ${context.calorieBudget} kcal/day
Protein Target: ${context.proteinTarget}g/day
Today's Progress:
- Calories consumed: ${caloriesConsumed} / ${context.calorieBudget} kcal
- Protein consumed: ${proteinConsumed} / ${context.proteinTarget}g
- Calories burned: ${caloriesBurned} kcal

User Profile:
- Activity level: ${context.weeklyActivity} days/week
- Schedule consistency: ${context.scheduleCons || "N/A"}/5
- Meal regularity: ${context.mealRegular || "N/A"}/5
- Time budget: ${context.timeBudgetMin} min/day
- Diet preferences: ${context.dietPrefs.join(", ") || "None"}
- Foods to avoid: ${context.avoidFoods.join(", ") || "None"}

Generate 3-5 personalized tips as a JSON array of strings:
["tip 1", "tip 2", "tip 3"]`;

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content);
    const tips = result.tips || result.goalTips || [];

    // Validate tips are strings
    if (Array.isArray(tips) && tips.every((tip) => typeof tip === "string")) {
      return tips.slice(0, 5); // Limit to 5 tips
    }

    throw new Error("Invalid tips format");
  } catch (error) {
    console.error("AI goal tips generation failed, using fallback:", error);
    return generateGoalTipsFallback(fitnessGoal, context);
  }
}

/**
 * Fallback tips (used when AI fails)
 */
function generateGoalTipsFallback(
  goal: string | null,
  context: Awaited<ReturnType<typeof getUserContext>>
): string[] {
  const tips: string[] = [];

  if (!goal) return tips;

  switch (goal) {
    case "LOSE_FAT":
      tips.push("Focus on protein-rich meals to maintain muscle while in a calorie deficit");
      tips.push("Aim for 10,000 steps daily to boost calorie burn");
      tips.push("Stay hydrated - sometimes thirst feels like hunger");
      if (context.timeBudgetMin && context.timeBudgetMin < 20) {
        tips.push("Even 10-minute walks can help - every bit counts!");
      }
      break;
    case "GAIN_MUSCLE":
      tips.push("Prioritize protein at every meal (aim for 20-30g per meal)");
      tips.push("Include strength training 3-4x per week");
      tips.push("Eat a balanced meal within 2 hours after workouts");
      break;
    case "MAINTAIN":
      tips.push("Balance your meals throughout the day");
      tips.push("Stay active with 30+ minutes of movement daily");
      tips.push("Listen to your body's hunger and fullness cues");
      break;
    case "FITNESS":
    case "ATHLETIC":
      tips.push("Fuel workouts with carbs before and protein after");
      tips.push("Stay consistent with your workout schedule");
      tips.push("Recovery is key - get adequate sleep and hydration");
      break;
  }

  return tips;
}

