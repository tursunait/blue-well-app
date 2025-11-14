import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. AI target calculation will fail.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CHAT_MODEL = process.env.PLANNER_CHAT_MODEL || "gpt-4o-mini";

export interface AICalculatedTargets {
  calorieBudget: number;
  proteinTarget: number;
  rationale?: string;
}

/**
 * Use AI to calculate personalized calorie and protein targets
 * Based on user's profile, goals, and activity level
 */
export async function calculateTargetsWithAI(userId: string): Promise<AICalculatedTargets> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // If missing essential data, use defaults
  if (!user.weightKg || !user.heightCm || !user.age || !user.gender) {
    return {
      calorieBudget: 2000,
      proteinTarget: 120,
      rationale: "Using default targets. Complete onboarding for personalized targets.",
    };
  }

  const systemPrompt = `You are a nutrition and fitness expert. Calculate personalized daily calorie and protein targets based on user profile data.

Use scientific formulas as a base:
- BMR (Basal Metabolic Rate): Mifflin-St Jeor equation
- TDEE (Total Daily Energy Expenditure): BMR × activity factor
- Adjust based on fitness goals

Activity factors:
- Rarely active (1): 1.2 (sedentary)
- 1-2 days/week (2): 1.375 (light activity)
- 3-4 days/week (3): 1.55 (moderate activity)
- 5+ days/week (4): 1.725 (very active)

Goal adjustments:
- LOSE_FAT: TDEE - 250 kcal (moderate deficit)
- GAIN_MUSCLE: TDEE + 200-300 kcal (surplus for muscle growth)
- FITNESS/ATHLETIC: TDEE + 200 kcal (support active lifestyle)
- MAINTAIN: TDEE (no adjustment)

Protein targets:
- General: 1.2-1.6 g/kg body weight
- Muscle gain: 1.6-2.2 g/kg
- Fat loss: 1.6-2.2 g/kg (preserve muscle)
- Fitness: 1.4-1.8 g/kg

Output as JSON:
{
  "calorieBudget": number,
  "proteinTarget": number,
  "rationale": "Brief explanation of the calculation"
}`;

  const userPrompt = `Calculate targets for:
- Weight: ${user.weightKg} kg
- Height: ${user.heightCm} cm
- Age: ${user.age} years
- Gender: ${user.gender}
- Activity level: ${user.weeklyActivity || 2} (${getActivityLabel(user.weeklyActivity || 2)})
- Fitness goal: ${user.fitnessGoal || "MAINTAIN"}
- Schedule consistency: ${user.scheduleCons || "N/A"}/5
- Meal regularity: ${user.mealRegular || "N/A"}/5

Provide personalized calorie budget and protein target.`;

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent calculations
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content) as AICalculatedTargets;

    // Validate and ensure reasonable values
    if (result.calorieBudget < 1200 || result.calorieBudget > 5000) {
      console.warn("AI returned unrealistic calorie budget, using fallback calculation");
      return calculateTargetsFallback(user);
    }

    if (result.proteinTarget < 50 || result.proteinTarget > 300) {
      console.warn("AI returned unrealistic protein target, using fallback calculation");
      return calculateTargetsFallback(user);
    }

    return {
      calorieBudget: Math.round(result.calorieBudget),
      proteinTarget: Math.round(result.proteinTarget),
      rationale: result.rationale,
    };
  } catch (error) {
    console.error("AI target calculation failed, using fallback:", error);
    return calculateTargetsFallback(user);
  }
}

function getActivityLabel(level: number): string {
  const labels = ["", "Rarely active", "1-2 days/week", "3-4 days/week", "5+ days/week"];
  return labels[level] || "Unknown";
}

/**
 * Fallback calculation using standard formulas
 * Used when AI fails or returns invalid values
 */
function calculateTargetsFallback(user: any): AICalculatedTargets {
  // Mifflin-St Jeor BMR
  const base = 10 * user.weightKg + 6.25 * user.heightCm - 5 * user.age;
  const bmr = user.gender === "Man" ? base + 5 : base - 161;

  // TDEE
  const activityFactors = [1.2, 1.375, 1.55, 1.725];
  const factor = activityFactors[(user.weeklyActivity || 2) - 1] || 1.2;
  const tdee = bmr * factor;

  // Goal adjustment
  let calorieBudget = tdee;
  if (user.fitnessGoal === "LOSE_FAT") {
    calorieBudget = tdee - 250;
  } else if (["GAIN_MUSCLE", "FITNESS", "ATHLETIC"].includes(user.fitnessGoal || "")) {
    calorieBudget = tdee + 200;
  }

  // Protein target
  const proteinPerKg = user.fitnessGoal === "GAIN_MUSCLE" || user.fitnessGoal === "LOSE_FAT" ? 1.6 : 1.2;
  const proteinTarget = user.weightKg * proteinPerKg;

  return {
    calorieBudget: Math.round(calorieBudget),
    proteinTarget: Math.round(proteinTarget),
    rationale: "Calculated using standard BMR/TDEE formulas",
  };
}

