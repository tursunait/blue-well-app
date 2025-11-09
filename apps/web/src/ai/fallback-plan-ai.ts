import OpenAI from "openai";
import { RecommendationDTO } from "./planner";
import { searchMenuItems, listRecClasses, getUserContext } from "./planner-tools";
import { prisma } from "@/lib/prisma";
import { loadFitnessClassesFromCSV, filterClassesByPreferences, inferIntensityFromTitle } from "@/lib/csv-loader";
import { parseJsonArray } from "@/lib/sqlite-utils";

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. AI fallback plan generation will fail.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CHAT_MODEL = process.env.PLANNER_CHAT_MODEL || "gpt-4o-mini";

/**
 * Get user's fitness preferences from survey answers
 */
export async function getUserFitnessPreferences(userId: string): Promise<{
  weeklyTarget?: number;
  preferredTimes?: string[];
  sportsClasses?: string[];
}> {
  try {
    const fitnessAnswer = await prisma.surveyAnswer.findFirst({
      where: {
        userId,
        questionId: "4", // Fitness preferences question
      },
      orderBy: {
        tsISO: "desc",
      },
    });

    if (!fitnessAnswer) {
      return {};
    }

    try {
      const value = JSON.parse(fitnessAnswer.value);
      return {
        weeklyTarget: value.weeklyTarget,
        preferredTimes: Array.isArray(value.preferredTimes) ? value.preferredTimes : [],
        sportsClasses: Array.isArray(value.sportsClasses) ? value.sportsClasses : [],
      };
    } catch {
      return {};
    }
  } catch (error) {
    console.warn("Error fetching fitness preferences:", error);
    return {};
  }
}

/**
 * Get available fitness classes (from CSV or database)
 */
export async function getAvailableFitnessClasses(
  preferredTimes?: string[],
  sportsClasses?: string[]
): Promise<any[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Try to load from CSV first
  let csvClasses = await loadFitnessClassesFromCSV();
  console.log(`[getAvailableFitnessClasses] Loaded ${csvClasses.length} total classes from CSV`);
  
  // Filter by date and preferences
  if (csvClasses.length > 0) {
    // First, try to filter by today's date
    let filteredByDate = filterClassesByPreferences(csvClasses, undefined, today);
    console.log(`[getAvailableFitnessClasses] Classes for today (${today.toISOString().split('T')[0]}): ${filteredByDate.length}`);
    
    // If no classes for today, try tomorrow
    if (filteredByDate.length === 0) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filteredByDate = filterClassesByPreferences(csvClasses, undefined, tomorrow);
      console.log(`[getAvailableFitnessClasses] Classes for tomorrow (${tomorrow.toISOString().split('T')[0]}): ${filteredByDate.length}`);
    }
    
    // If still no classes, use all classes (date might be in future in CSV)
    if (filteredByDate.length === 0) {
      console.warn("[getAvailableFitnessClasses] No classes found for today or tomorrow, using all classes from CSV");
      filteredByDate = csvClasses;
    }
    
    // Now filter by time preferences
    if (preferredTimes && preferredTimes.length > 0) {
      const beforeTimeFilter = filteredByDate.length;
      csvClasses = filterClassesByPreferences(filteredByDate, preferredTimes);
      console.log(`[getAvailableFitnessClasses] After time filter (${preferredTimes.join(', ')}): ${beforeTimeFilter} → ${csvClasses.length}`);
    } else {
      csvClasses = filteredByDate;
    }
    
    // Convert to format expected by planner
    return csvClasses.map((cls) => {
      // Parse date and time
      let startTime: Date | null = null;
      let endTime: Date | null = null;
      
      if (cls.date && cls.startTime && !cls.allDay) {
        try {
          // Parse date (format: YYYY-MM-DD)
          const datePart = cls.date.trim();
          
          // Parse time (format: "5:00 PM" or "5:00PM")
          const timeStr = cls.startTime.trim();
          const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
          
          if (timeMatch) {
            let hour = parseInt(timeMatch[1]) || 0;
            const min = parseInt(timeMatch[2]) || 0;
            const ampm = timeMatch[3].toUpperCase();
            
            if (ampm === "PM" && hour !== 12) {
              hour += 12;
            } else if (ampm === "AM" && hour === 12) {
              hour = 0;
            }
            
            // Create date string: YYYY-MM-DDTHH:MM:00
            const dateTimeStr = `${datePart}T${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}:00`;
            startTime = new Date(dateTimeStr);
            
            // Validate the date is valid
            if (isNaN(startTime.getTime())) {
              throw new Error("Invalid date");
            }
            
            endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour
          }
        } catch (e) {
          console.warn(`Failed to parse class time: ${cls.date} ${cls.startTime}`, e);
          // Will use default time below
        }
      }
      
      if (!startTime) {
        // Use default time if parsing failed
        startTime = new Date(today);
        startTime.setHours(17, 0, 0, 0); // 5 PM default
        endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      }
      
      const intensity = inferIntensityFromTitle(cls.title);
      
      // Match sports classes preferences
      const matchesPreference = !sportsClasses || sportsClasses.length === 0 || 
        sportsClasses.some((pref) => {
          const prefLower = pref.toLowerCase();
          const titleLower = cls.title.toLowerCase();
          return titleLower.includes(prefLower) || 
                 (prefLower === "yoga" && titleLower.includes("yoga")) ||
                 (prefLower === "hiit" && (titleLower.includes("hiit") || titleLower.includes("cardio"))) ||
                 (prefLower === "running" && (titleLower.includes("run") || titleLower.includes("cardio"))) ||
                 (prefLower === "swimming" && (titleLower.includes("swim") || titleLower.includes("aqua"))) ||
                 (prefLower === "cycling" && (titleLower.includes("cycle") || titleLower.includes("spin"))) ||
                 (prefLower === "pilates" && titleLower.includes("pilates"));
        });
      
      const classData = {
        id: `csv-${cls.date}-${cls.title}-${cls.startTime}`,
        title: cls.title,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        location: cls.location || "Duke Rec",
        intensity,
        source: "DUKE_REC" as const,
        matchesPreference,
      };
      
      return classData;
    });
    
    // Filter by sports preferences if specified
    let finalClasses = csvClasses;
    if (sportsClasses && sportsClasses.length > 0) {
      const beforeFilter = finalClasses.length;
      finalClasses = finalClasses.filter((cls) => cls.matchesPreference);
      console.log(`[getAvailableFitnessClasses] After sports filter (${sportsClasses.join(', ')}): ${beforeFilter} → ${finalClasses.length}`);
    }
    
    // Sort: prioritize classes that match preferences
    finalClasses.sort((a, b) => {
      if (a.matchesPreference && !b.matchesPreference) return -1;
      if (!a.matchesPreference && b.matchesPreference) return 1;
      return 0;
    });
    
    console.log(`[getAvailableFitnessClasses] Returning ${finalClasses.length} classes. Matching preferences: ${finalClasses.filter(c => c.matchesPreference).length}`);
    return finalClasses;
  }

  // Fallback to database
  try {
    const dbClasses = await listRecClasses({
      from: today.toISOString(),
      to: tomorrow.toISOString(),
    });
    return dbClasses;
  } catch (error) {
    console.warn("Error loading classes from database:", error);
    return [];
  }
}

/**
 * Generate a fallback plan using AI when primary AI generation fails
 * This is more intelligent than the simple rule-based fallback
 * Uses user's fitness preferences and available classes from CSV
 */
export async function generateFallbackPlanWithAI(
  userId: string,
  context: Awaited<ReturnType<typeof getUserContext>>,
  user: any
): Promise<RecommendationDTO> {
  const targetKcal = context.calorieBudget || 2000;
  const targetProtein = context.proteinTarget || 120;

  // Get user's fitness preferences
  const fitnessPrefs = await getUserFitnessPreferences(userId);
  const preferredTimes = fitnessPrefs.preferredTimes || [];
  const sportsClasses = fitnessPrefs.sportsClasses || [];

  // Get available menu items and classes
  const [menuItems, classes] = await Promise.all([
    searchMenuItems({
      dietPrefs: context.dietPrefs,
      proteinMin: context.fitnessGoal === "GAIN_MUSCLE" ? 20 : undefined,
    }).catch(() => []),
    getAvailableFitnessClasses(preferredTimes, sportsClasses),
  ]);

  const systemPrompt = `You are BlueWell's Planner. Generate a practical daily wellness plan when the primary AI system is unavailable.

Create a simple but effective plan with:
- 3 meals (breakfast, lunch, dinner) that meet calorie and protein targets
- 1 workout suggestion
- Specific meal recommendations from available menu items if possible
- Realistic times for a busy student

Output as RecommendationDTO JSON format.`;

  const userPrompt = `Generate a fallback plan for today:

User Profile:
- Calorie budget: ${targetKcal} kcal/day
- Protein target: ${targetProtein}g/day
- Diet preferences: ${context.dietPrefs.join(", ") || "None"}
- Foods to avoid: ${context.avoidFoods.join(", ") || "None"}
- Fitness goal: ${user.fitnessGoal || "MAINTAIN"}
- Time budget: ${context.timeBudgetMin} min/day

Fitness Preferences:
- Weekly workout target: ${fitnessPrefs.weeklyTarget || "Not specified"} days/week
- Preferred times: ${preferredTimes.join(", ") || "Any time"}
- Preferred activities: ${sportsClasses.join(", ") || "Any activity"}

Available menu items (first 10): ${JSON.stringify(menuItems.slice(0, 10))}
Available fitness classes (filtered by preferences, first 10): ${JSON.stringify(classes.slice(0, 10).map(c => ({
  title: c.title,
  startTime: c.startTime,
  location: c.location,
  intensity: c.intensity,
  matchesPreference: c.matchesPreference
})))}

IMPORTANT: Select a workout from the available fitness classes that matches the user's preferences (preferred times and sports classes). If a class matches their preferences, prioritize it. Use the exact class title, startTime, and location from the available classes list.`;

  try {
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const planJson = JSON.parse(content);

    return {
      window: "TODAY",
      totals: {
        targetKcal,
        remainingKcal: targetKcal,
        estBurn: 0,
        targetProteinG: targetProtein,
      },
      items: planJson.items || await generateSimpleFallbackItems(targetKcal, targetProtein, preferredTimes, sportsClasses),
      rationale: planJson.rationale || `Your daily plan: ${targetKcal} kcal and ${targetProtein}g protein to support your ${user.fitnessGoal || "wellness"} goals.`,
    };
  } catch (error) {
    console.error("AI fallback plan generation failed, using simple fallback:", error);
    return generateSimpleFallbackPlan(targetKcal, targetProtein, user, preferredTimes, sportsClasses);
  }
}

/**
 * Simple rule-based fallback (used if AI also fails)
 */
async function generateSimpleFallbackPlan(
  targetKcal: number,
  targetProtein: number,
  user: any,
  preferredTimes?: string[],
  sportsClasses?: string[]
): Promise<RecommendationDTO> {
  const items = await generateSimpleFallbackItems(targetKcal, targetProtein, preferredTimes, sportsClasses);
  
  return {
    window: "TODAY",
    totals: {
      targetKcal,
      remainingKcal: targetKcal,
      estBurn: 0,
      targetProteinG: targetProtein,
    },
    items,
    rationale: `Your daily plan: ${targetKcal} kcal and ${targetProtein}g protein to support your ${user.fitnessGoal || "wellness"} goals.`,
  };
}

/**
 * Generate simple fallback items with workout from available classes
 */
async function generateSimpleFallbackItems(
  targetKcal: number,
  targetProtein: number,
  preferredTimes?: string[],
  sportsClasses?: string[]
) {
  const meals = [
    {
      kind: "MEAL" as const,
      title: "Breakfast",
      calories: Math.round(targetKcal * 0.25),
      proteinG: Math.round(targetProtein * 0.25),
      when: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
      acquisition: "CAMPUS" as const,
    },
    {
      kind: "MEAL" as const,
      title: "Lunch",
      calories: Math.round(targetKcal * 0.35),
      proteinG: Math.round(targetProtein * 0.35),
      when: new Date(new Date().setHours(12, 30, 0, 0)).toISOString(),
      acquisition: "CAMPUS" as const,
    },
    {
      kind: "MEAL" as const,
      title: "Dinner",
      calories: Math.round(targetKcal * 0.40),
      proteinG: Math.round(targetProtein * 0.40),
      when: new Date(new Date().setHours(18, 30, 0, 0)).toISOString(),
      acquisition: "CAMPUS" as const,
    },
  ];

  // Try to get a workout from available classes
  const availableClasses = await getAvailableFitnessClasses(preferredTimes, sportsClasses);
  
  let workout;
  if (availableClasses.length > 0) {
    // Prefer classes that match preferences
    const matchingClass = availableClasses.find((c) => c.matchesPreference) || availableClasses[0];
    workout = {
      kind: "WORKOUT" as const,
      title: matchingClass.title,
      start: matchingClass.startTime,
      end: matchingClass.endTime,
      source: "DUKE_REC" as const,
      intensity: matchingClass.intensity || ("med" as const),
      location: matchingClass.location,
    };
  } else {
    // Fallback to generic workout
    workout = {
      kind: "WORKOUT" as const,
      title: "Daily Activity",
      start: new Date(new Date().setHours(17, 0, 0, 0)).toISOString(),
      end: new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
      source: "SUGGESTED" as const,
      intensity: "med" as const,
    };
  }

  return [...meals, workout];
}

