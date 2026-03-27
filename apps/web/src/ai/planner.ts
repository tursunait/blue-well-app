import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { searchMenuItems, getUserContext, listRecClasses, composeTimeline } from "./planner-tools";
import { getAvailableFitnessClasses, getUserFitnessPreferences } from "./fallback-plan-ai";

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. AI plan generation will fail.");
}

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

IMPORTANT: When selecting workouts:
- ALWAYS prioritize classes from the list_rec_classes tool that match the user's preferred times and activities
- Use the exact class title, startTime, endTime, and location from the available classes
- If a class has matchesPreference: true, prioritize it over others
- Only use "SUGGESTED" source with generic titles if NO matching classes are available

Tone: friendly, non-judgmental, no medical advice. If data is missing, pick safe defaults and mark as "estimate".

Output strictly as RecommendationDTO JSON.`;

export async function generatePlanForWindow(opts: {
  userId: string;
  window: "TODAY" | "NEXT_6_HOURS";
}): Promise<RecommendationDTO> {
  const { userId, window } = opts;
  
  // Get user context (includes calorie budget calculation)
  const userContext = await getUserContext(userId);
  
  // Get user's fitness preferences for class filtering
  const fitnessPrefs = await getUserFitnessPreferences(userId).catch(() => ({} as Awaited<ReturnType<typeof getUserFitnessPreferences>>));
  const preferredTimes = fitnessPrefs.preferredTimes || [];
  const sportsClasses = fitnessPrefs.sportsClasses || [];
  
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
        description: "Search for menu items from Duke Dining database (MenuItem/MenuVendor tables in SQLite) matching criteria. Returns items with exact calories, protein, and restaurant names from database.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query (item name, category, or restaurant)" },
            dietPrefs: {
              type: "array",
              items: { type: "string" },
              description: "Diet preferences (e.g., vegan, vegetarian, gluten-free, dairy-free)",
            },
            proteinMin: { type: "number", description: "Minimum protein in grams" },
            priceMax: { type: "number", description: "Maximum price in USD (optional)" },
            mealType: {
              type: "string",
              enum: ["Breakfast", "Lunch", "Dinner"],
              description: "Filter by meal type (Breakfast, Lunch, or Dinner)",
            },
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
        content: `Create a personalized plan for ${window} based on the user's onboarding survey answers from the database.

IMPORTANT: You MUST use the search_menu tool to find real menu items from the Duke Dining database (MenuItem/MenuVendor tables). 
- Call search_menu with mealType="Breakfast" for breakfast meals
- Call search_menu with mealType="Lunch" for lunch meals  
- Call search_menu with mealType="Dinner" for dinner meals
- Use the EXACT item names and vendor names from the database search results

User Profile (from database):
- Calorie budget: ${targetKcal} kcal/day (calculated from: weight ${userContext.weightKg || 'N/A'}kg, height ${userContext.heightCm || 'N/A'}cm, age ${userContext.age || 'N/A'}, activity level ${userContext.weeklyActivity}, goal: ${userContext.fitnessGoal})
- Protein target: ${targetProtein}g/day
- Diet preferences: ${userContext.dietPrefs.join(", ") || "None"}
- Foods to avoid: ${userContext.avoidFoods.join(", ") || "None"}
- Time budget: ${userContext.timeBudgetMin} minutes/day
- Schedule consistency: ${userContext.scheduleCons || "N/A"}/5
- Meal regularity: ${userContext.mealRegular || "N/A"}/5

Fitness Preferences (from onboarding survey question 4):
- Preferred workout times: ${preferredTimes.join(", ") || "Any time"}
- Preferred activities: ${sportsClasses.join(", ") || "Any activity"}

IMPORTANT: Use list_rec_classes tool to find classes from duke_rec_schedule.csv that match these preferences.

Today's Progress:
- Calories consumed: ${consumedKcal} kcal
- Calories burned: ${estBurn} kcal
- Calories remaining: ${remainingKcal} kcal
- Protein consumed: ${consumedProtein}g
- Protein remaining: ${targetProtein - consumedProtein}g

Generate a practical plan with specific meal recommendations and workout suggestions that help achieve the user's fitness goal: ${userContext.fitnessGoal || "MAINTAIN"}.`,
    },
  ];
  
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured. Please set it in .env.local");
  }

  let response;
  try {
    response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      tools,
      tool_choice: "auto",
    });
  } catch (openaiError: any) {
    console.error("OpenAI API error:", {
      status: openaiError?.status,
      statusText: openaiError?.statusText,
      message: openaiError?.message,
      code: openaiError?.code,
      type: openaiError?.type,
      error: openaiError?.error,
    });
    if (openaiError?.status === 401) {
      throw new Error("Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env.local");
    } else if (openaiError?.status === 429) {
      throw new Error("OpenAI API rate limit exceeded. Please try again later.");
    } else if (openaiError?.code === "insufficient_quota") {
      throw new Error("OpenAI API quota exceeded. Please check your OpenAI account billing.");
    } else {
      const errorMsg = openaiError?.error?.message || openaiError?.message || String(openaiError);
      throw new Error(`OpenAI API error: ${errorMsg}${openaiError?.status ? ` (Status: ${openaiError.status})` : ""}`);
    }
  }
  
  // Handle function calls
  let finalResponse = response.choices[0].message;
  const toolCalls = finalResponse.tool_calls || [];
  
  for (const toolCall of toolCalls) {
    if (toolCall.type === "function" && "function" in toolCall && toolCall.function.name === "search_menu") {
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`[planner] search_menu called with:`, args);
      const results = await searchMenuItems(args);
      console.log(`[planner] search_menu returned ${results.length} items:`, results.slice(0, 3).map((r: any) => ({
        name: r.name,
        vendor: r.vendor,
        calories: r.calories,
        proteinG: r.proteinG
      })));
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(results),
      });
    } else if (toolCall.type === "function" && "function" in toolCall && toolCall.function.name === "list_rec_classes") {
      const args = JSON.parse(toolCall.function.arguments);
      
      // Use CSV classes with preference filtering instead of database
      console.log("[planner] Loading fitness classes with preferences:", { preferredTimes, sportsClasses });
      let csvClasses = await getAvailableFitnessClasses(preferredTimes, sportsClasses);
      console.log(`[planner] Loaded ${csvClasses.length} classes from CSV`);
      
      // Filter by time window if specified
      let filteredClasses = csvClasses;
      if (args.from && args.to) {
        const fromDate = new Date(args.from);
        const toDate = new Date(args.to);
        console.log(`[planner] Filtering by time window: ${fromDate.toISOString()} to ${toDate.toISOString()}`);
        
        // First try exact time window
        filteredClasses = csvClasses.filter((cls: any) => {
          try {
            const clsStart = new Date(cls.startTime);
            if (isNaN(clsStart.getTime())) return false;
            return clsStart >= fromDate && clsStart <= toDate;
          } catch (e) {
            console.warn(`[planner] Error parsing class time: ${cls.startTime}`, e);
            return false;
          }
        });
        console.log(`[planner] Classes in exact time window: ${filteredClasses.length}`);
        
        // If still no classes, expand search to next 7 days
        if (filteredClasses.length === 0) {
          const extendedTo = new Date(toDate);
          extendedTo.setDate(extendedTo.getDate() + 7);
          filteredClasses = csvClasses.filter((cls: any) => {
            try {
              const clsStart = new Date(cls.startTime);
              if (isNaN(clsStart.getTime())) return false;
              return clsStart >= fromDate && clsStart <= extendedTo;
            } catch {
              return false;
            }
          });
          console.log(`[planner] No classes in exact window, expanded to next 7 days: ${filteredClasses.length} classes`);
        }
      }
      
      // Filter by intensity if specified
      if (args.intensity) {
        const beforeIntensity = filteredClasses.length;
        filteredClasses = filteredClasses.filter((cls: any) => cls.intensity === args.intensity);
        console.log(`[planner] After intensity filter (${args.intensity}): ${beforeIntensity} → ${filteredClasses.length}`);
      }
      
      // Convert to format expected by AI
      const formattedClasses = filteredClasses.map((cls: any) => ({
        id: cls.id,
        title: cls.title,
        startTime: cls.startTime,
        endTime: cls.endTime,
        location: cls.location,
        intensity: cls.intensity,
        source: cls.source,
        matchesPreference: cls.matchesPreference,
      }));
      
      const matchingCount = formattedClasses.filter((c: any) => c.matchesPreference).length;
      console.log(`[planner] Sending ${formattedClasses.length} classes to AI. Matching preferences: ${matchingCount}`);
      
      if (formattedClasses.length > 0) {
        console.log(`[planner] Sample classes:`, formattedClasses.slice(0, 3).map((c: any) => ({
          title: c.title,
          time: c.startTime,
          matches: c.matchesPreference
        })));
      }
      
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(formattedClasses),
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
        content: `Now generate the final RecommendationDTO JSON plan based on the available data.

CRITICAL WORKOUT REQUIREMENTS:
1. You MUST include a workout item in the plan
2. You MUST use one of the classes from the list_rec_classes tool results (if any were provided)
3. If classes with matchesPreference: true exist, you MUST use one of those (prioritize them)
4. Use the EXACT title, startTime, endTime, and location from the class data
5. Set source to "DUKE_REC" (NOT "SUGGESTED") for real classes
6. Only use a generic "SUGGESTED" workout if NO classes were provided in the tool results

CRITICAL MEAL REQUIREMENTS:
1. You MUST use menu items from the search_menu tool results (Duke Dining database - MenuItem/MenuVendor tables)
2. The "title" field MUST be the EXACT "name" from the database menu item (e.g., "Chicken Marsala", NOT "Breakfast" or "Lunch")
3. The "vendor" field MUST be the EXACT "vendor.name" from the database (e.g., "Marketplace", "Bella Union", "Trinity Cafe")
4. Use EXACT calories and proteinG values from the database menu item
5. DO NOT use generic meal names like "Breakfast", "Lunch", or "Dinner" as the title
6. The title should be the actual food item name from the database (e.g., "Buffalo Chicken Wrap", "Chicken Marsala")
7. Ensure meals meet calorie and protein targets from user's calculated goals

Example meal item format (CORRECT):
{
  "kind": "MEAL",
  "title": "Chicken Marsala",  // EXACT "name" from menu item (NOT "Dinner" or "Lunch")
  "vendor": "Marketplace",  // EXACT "vendor" from menu item
  "calories": 340,  // EXACT calories from menu item
  "proteinG": 24,  // EXACT proteinG from menu item
  "acquisition": "CAMPUS",
  "when": "2025-11-10T08:00:00.000Z"
}

WRONG example (DO NOT DO THIS):
{
  "kind": "MEAL",
  "title": "Breakfast",  // ❌ WRONG - this is generic, not the actual food name
  "vendor": "Marketplace",
  ...
}

DO NOT create generic meals. Always use the EXACT food item name and restaurant name from the Duke Dining database (MenuItem/MenuVendor tables).`,
      },
    ],
    response_format: { type: "json_object" },
  });
  
  const planJson = JSON.parse(finalPlanResponse.choices[0].message.content || "{}");
  
  // Log workout items for debugging
  const workoutItems = (planJson.items || []).filter((item: any) => item.kind === "WORKOUT");
  const mealItems = (planJson.items || []).filter((item: any) => item.kind === "MEAL");
  console.log(`[planner] Plan generated with ${planJson.items?.length || 0} items`);
  console.log(`[planner] Workout items: ${workoutItems.length}`);
  workoutItems.forEach((w: any, idx: number) => {
    console.log(`[planner] Workout ${idx + 1}:`, {
      title: w.title,
      source: w.source,
      start: w.start,
      location: w.location
    });
  });
  console.log(`[planner] Meal items: ${mealItems.length}`);
  
  // ALWAYS ensure meals have exact food items and restaurant names from database (MenuItem/MenuVendor tables)
  const fixedItems = await Promise.all((planJson.items || []).map(async (item: any) => {
    if (item.kind === "MEAL") {
      // Check if title is generic or vendor is missing
      const genericTitles = ["Breakfast", "Lunch", "Dinner", "Meal"];
      const isGeneric = genericTitles.some(g => item.title?.toLowerCase() === g.toLowerCase());
      const hasNoVendor = !item.vendor || item.vendor.trim() === "";
      
      // ALWAYS fix if generic or missing vendor
      if (isGeneric || hasNoVendor) {
        console.warn(`[planner] ⚠️ Meal has generic title "${item.title}" or missing vendor "${item.vendor}" - FIXING NOW...`);
        
        try {
          // Determine meal type from time
          let mealType: "Breakfast" | "Lunch" | "Dinner" | undefined;
          const mealTime = item.when ? new Date(item.when).getHours() : undefined;
          
          if (mealTime !== undefined) {
            if (mealTime >= 6 && mealTime < 11) {
              mealType = "Breakfast";
            } else if (mealTime >= 11 && mealTime < 16) {
              mealType = "Lunch";
            } else if (mealTime >= 16) {
              mealType = "Dinner";
            }
          }
          
          // Search for menu items from database matching the meal type
          const menuResults = await searchMenuItems({
            mealType,
            proteinMin: item.proteinG ? Math.max(0, item.proteinG - 10) : undefined,
            dietPrefs: userContext.dietPrefs,
          });
          
          console.log(`[planner] Found ${menuResults.length} database items for meal type ${mealType}`);
          
          if (menuResults.length > 0) {
            // Find best match by calories (closest to target)
            const targetCalories = item.calories || 600;
            const bestMatch = menuResults.reduce((best, current) => {
              const bestDiff = Math.abs((best.calories || 0) - targetCalories);
              const currentDiff = Math.abs((current.calories || 0) - targetCalories);
              return currentDiff < bestDiff ? current : best;
            });
            
            console.log(`[planner] ✅ FIXED meal: "${item.title || 'Generic'}" → "${bestMatch.name}" from "${bestMatch.vendor}"`);
            console.log(`[planner] ✅ Calories: ${item.calories || 'N/A'} → ${bestMatch.calories}, Protein: ${item.proteinG || 'N/A'}g → ${bestMatch.proteinG}g`);
            
            // Return with EXACT values from database (MenuItem/MenuVendor tables)
            return {
              ...item,
              title: bestMatch.name, // EXACT food item name from database
              vendor: bestMatch.vendor, // EXACT restaurant name from database
              calories: bestMatch.calories, // EXACT calories from database
              proteinG: bestMatch.proteinG, // EXACT protein from database
              menuItemId: bestMatch.id, // Database ID
            };
          } else {
            console.error(`[planner] ❌ No menu items found for meal type ${mealType}`);
          }
        } catch (error) {
          console.error(`[planner] ❌ Error fixing meal item:`, error);
        }
      } else {
        // Even if not generic, verify it's a real menu item
        console.log(`[planner] ✓ Meal looks good: "${item.title}" from "${item.vendor}"`);
      }
      
      // Log the final meal item
      console.log(`[planner] Final meal:`, {
        title: item.title,
        vendor: item.vendor,
        calories: item.calories,
        proteinG: item.proteinG,
        when: item.when
      });
    }
    
    return item;
  }));
  
  // Validate and return
  return {
    window,
    totals: {
      targetKcal,
      remainingKcal: Math.max(0, remainingKcal),
      estBurn,
      targetProteinG: targetProtein,
    },
    items: fixedItems,
    rationale: planJson.rationale || "Personalized plan based on your goals and schedule.",
  };
}

