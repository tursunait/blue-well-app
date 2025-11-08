import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { searchMenuItems, getUserContext, listRecClasses, composeTimeline } from "./planner-tools";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CHAT_MODEL = process.env.PLANNER_CHAT_MODEL || "gpt-4o-mini";

export type RecommendationDTO = {
  window: "TODAY" | "NEXT_6_HOURS";
  totals: {
    targetKcal: number;
    remainingKcal: number;
    estBurn?: number;
    targetProteinG?: number;
  };
  items: Array<
    | {
        kind: "WORKOUT";
        title: string;
        start: string;
        end: string;
        location?: string;
        source: "DUKE_REC" | "SUGGESTED";
        intensity?: "low" | "med" | "high";
        url?: string;
      }
    | {
        kind: "MEAL";
        title: string;
        vendor?: string;
        menuItemId?: string;
        calories: number;
        proteinG?: number;
        carbsG?: number;
        fatG?: number;
        acquisition: "CAMPUS" | "DELIVERY" | "COOK";
        deliveryApp?: "UBER_EATS" | "DOORDASH" | "GRUBHUB";
        when: string;
      }
    | {
        kind: "NUDGE";
        text: string;
        when: string;
      }
  >;
  rationale: string; // <= 220 chars
};

const SYSTEM_PROMPT = `You are BlueWell's Planner. Produce short, practical plans for busy students.

Objectives: meet calorie/protein targets, suggest one concrete workout/class, choose on-campus or delivery meals users can actually get, and place items across the time window.

Tone: friendly, non-judgmental, no medical advice. If data is missing, pick safe defaults and mark as "estimate".

Output strictly as RecommendationDTO JSON.`;

export async function generatePlanForWindow(opts: {
  userId: string;
  window: "TODAY" | "NEXT_6_HOURS";
}): Promise<RecommendationDTO> {
  const { userId, window } = opts;
  
  // Get user context (includes calorie budget calculation)
  const userContext = await getUserContext(userId);
  
  // Calculate window boundaries
  const now = new Date();
  const windowEnd = new Date(now);
  if (window === "TODAY") {
    windowEnd.setHours(23, 59, 59, 999);
  } else {
    windowEnd.setHours(now.getHours() + 6, 59, 59, 999);
  }
  
  // Get today's logs
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  
  const foodLogs = await prisma.foodLog.findMany({
    where: {
      userId,
      ts: {
        gte: todayStart,
        lte: windowEnd,
      },
    },
  });
  
  const activityLogs = await prisma.activityLog.findMany({
    where: {
      userId,
      ts: {
        gte: todayStart,
        lte: windowEnd,
      },
    },
  });
  
  const consumedKcal = foodLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
  const consumedProtein = foodLogs.reduce((sum, log) => sum + (log.proteinG || 0), 0);
  const estBurn = activityLogs.reduce((sum, log) => sum + (log.kcalBurn || 0), 0);
  
  const targetKcal = userContext.calorieBudget || 2000;
  const targetProtein = userContext.proteinTarget || 120;
  const remainingKcal = targetKcal - consumedKcal + estBurn;
  
  // Prepare tools for function calling
  const tools = [
    {
      type: "function" as const,
      function: {
        name: "search_menu",
        description: "Search for menu items matching criteria",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            dietPrefs: {
              type: "array",
              items: { type: "string" },
              description: "Diet preferences",
            },
            proteinMin: { type: "number", description: "Minimum protein (g)" },
            priceMax: { type: "number", description: "Maximum price" },
          },
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "list_rec_classes",
        description: "List Duke Rec fitness classes in time window",
        parameters: {
          type: "object",
          properties: {
            from: { type: "string", description: "Start time (ISO)" },
            to: { type: "string", description: "End time (ISO)" },
            intensity: { type: "string", enum: ["low", "med", "high"] },
          },
        },
      },
    },
  ];
  
  // Call OpenAI with function calling
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `Create a personalized plan for ${window} based on the user's onboarding answers.

User Profile:
- Calorie budget: ${targetKcal} kcal/day (calculated from: weight ${userContext.weightKg || 'N/A'}kg, height ${userContext.heightCm || 'N/A'}cm, age ${userContext.age || 'N/A'}, activity level ${userContext.weeklyActivity}, goal: ${userContext.fitnessGoal})
- Protein target: ${targetProtein}g/day
- Diet preferences: ${userContext.dietPrefs.join(", ") || "None"}
- Foods to avoid: ${userContext.avoidFoods.join(", ") || "None"}
- Time budget: ${userContext.timeBudgetMin} minutes/day
- Schedule consistency: ${userContext.scheduleCons || "N/A"}/5
- Meal regularity: ${userContext.mealRegular || "N/A"}/5

Today's Progress:
- Calories consumed: ${consumedKcal} kcal
- Calories burned: ${estBurn} kcal
- Calories remaining: ${remainingKcal} kcal
- Protein consumed: ${consumedProtein}g
- Protein remaining: ${targetProtein - consumedProtein}g

Generate a practical plan with specific meal recommendations and workout suggestions that help achieve the user's fitness goal: ${userContext.fitnessGoal || "MAINTAIN"}.`,
    },
  ];
  
  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    tools,
    tool_choice: "auto",
  });
  
  // Handle function calls
  let finalResponse = response.choices[0].message;
  const toolCalls = finalResponse.tool_calls || [];
  
  for (const toolCall of toolCalls) {
    if (toolCall.function.name === "search_menu") {
      const args = JSON.parse(toolCall.function.arguments);
      const results = await searchMenuItems(args);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(results),
      });
    } else if (toolCall.function.name === "list_rec_classes") {
      const args = JSON.parse(toolCall.function.arguments);
      const results = await listRecClasses(args);
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(results),
      });
    }
  }
  
  // Get final plan
  const finalPlanResponse = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      ...messages,
      {
        role: "assistant",
        content: finalResponse.content || "",
        tool_calls: toolCalls,
      },
      ...messages.slice(1), // Add tool results
      {
        role: "user",
        content: "Now generate the final RecommendationDTO JSON plan based on the available data.",
      },
    ],
    response_format: { type: "json_object" },
  });
  
  const planJson = JSON.parse(finalPlanResponse.choices[0].message.content || "{}");
  
  // Validate and return
  return {
    window,
    totals: {
      targetKcal,
      remainingKcal: Math.max(0, remainingKcal),
      estBurn,
      targetProteinG: targetProtein,
    },
    items: planJson.items || [],
    rationale: planJson.rationale || "Personalized plan based on your goals and schedule.",
  };
}

