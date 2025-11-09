import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { generatePlanForWindow } from "@/ai/planner";
import { getUserContext } from "@/ai/planner-tools";
import { getUserId, getDevUser } from "@/lib/auth-dev";

export async function GET(request: NextRequest) {
  // Get user ID - works in both dev and prod mode
  const session = await getServerSession(authOptions);
  let userId: string | null = null;
  
  try {
    userId = await getUserId(session);
    console.log("getUserId returned:", userId, "SKIP_AUTH:", process.env.SKIP_AUTH);
  } catch (error) {
    console.error("Error in getUserId:", error);
  }
  
  // Fallback: if no user ID and in dev mode, try to get dev user directly
  if (!userId) {
    try {
      userId = await getDevUser();
      console.log("getDevUser returned:", userId);
    } catch (error) {
      console.error("Error getting dev user:", error);
      return NextResponse.json({ 
        error: "Unauthorized", 
        details: error instanceof Error ? error.message : String(error),
        skipAuth: process.env.SKIP_AUTH 
      }, { status: 401 });
    }
  }
  
  if (!userId) {
    return NextResponse.json({ 
      error: "Unauthorized", 
      details: "No user ID found",
      skipAuth: process.env.SKIP_AUTH 
    }, { status: 401 });
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Check if user has completed onboarding (has basic profile data)
    const hasOnboarding = user.age && user.heightCm && user.weightKg && user.fitnessGoal;
    if (!hasOnboarding) {
      console.log("Onboarding check failed:", {
        hasAge: !!user.age,
        hasHeight: !!user.heightCm,
        hasWeight: !!user.weightKg,
        hasGoal: !!user.fitnessGoal,
      });
      return NextResponse.json(
        { 
          error: "Please complete the onboarding survey first",
          requiresOnboarding: true 
        },
        { status: 400 }
      );
    }
    
    // Get latest recommendation or generate new one
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const existing = await prisma.recommendation.findFirst({
      where: {
        userId: user.id,
        scope: "TODAY",
        date: {
          gte: todayStart,
        },
      },
      orderBy: {
        date: "desc",
      },
    });
    
      if (existing && existing.payload) {
        // Parse payload from JSON string (SQLite compatibility)
        const { parseJsonObject } = await import("@/lib/sqlite-utils");
        const payload = parseJsonObject(existing.payload);
        if (payload) {
          return NextResponse.json(payload);
        }
      }
    
    // Get user context for additional info
    const context = await getUserContext(user.id);
    
    // Debug: Log API key status (first 10 chars only for security)
    console.log("OpenAI API Key check:", {
      hasKey: !!process.env.OPENAI_API_KEY,
      keyLength: process.env.OPENAI_API_KEY?.length || 0,
      keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 10) || "N/A",
    });
    
    // Try to generate plan with AI, fallback to simple plan if OpenAI fails
    let plan;
    try {
      plan = await generatePlanForWindow({
        userId: user.id,
        window: "TODAY",
      });
    } catch (aiError) {
      console.warn("AI plan generation failed, using fallback:", aiError);
      // Generate a simple fallback plan
      try {
        plan = generateFallbackPlan(context, user);
      } catch (fallbackError) {
        console.error("Fallback plan generation also failed:", fallbackError);
        throw new Error(`Failed to generate plan: ${aiError instanceof Error ? aiError.message : String(aiError)}`);
      }
    }
    
    // Add goal achievement tips
    const goalTips = generateGoalTips(user.fitnessGoal, context);
    
          // Save recommendation
          // Stringify payload for SQLite compatibility
          const { stringifyJsonObject } = await import("@/lib/sqlite-utils");
          await prisma.recommendation.create({
            data: {
              userId: user.id,
              scope: "TODAY",
              payload: stringifyJsonObject({ ...plan, goalTips }) || "{}",
              rationale: plan.rationale,
              date: new Date(),
            },
          });
    
    return NextResponse.json({ ...plan, goalTips });
  } catch (error) {
    console.error("Error generating plan:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details for debugging
    console.error("Full error details:", {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : undefined,
    });
    
    return NextResponse.json(
      { 
        error: "Failed to generate plan", 
        details: errorMessage,
        // Include more context in development
        ...(process.env.NODE_ENV === "development" && { stack: errorStack })
      },
      { status: 500 }
    );
  }
}

function generateFallbackPlan(context: any, user: any) {
  const targetKcal = context.calorieBudget || 2000;
  const targetProtein = context.proteinTarget || 120;
  
  // Simple fallback plan without AI
  return {
    window: "TODAY" as const,
    totals: {
      targetKcal,
      remainingKcal: targetKcal,
      estBurn: 0,
      targetProteinG: targetProtein,
    },
    items: [
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
      {
        kind: "WORKOUT" as const,
        title: "Daily Activity",
        start: new Date(new Date().setHours(17, 0, 0, 0)).toISOString(),
        end: new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
        source: "SUGGESTED" as const,
        intensity: "med" as const,
      },
    ],
    rationale: `Your daily plan: ${targetKcal} kcal and ${targetProtein}g protein to support your ${user.fitnessGoal || "wellness"} goals.`,
  };
}

function generateGoalTips(goal: string | null, context: any): string[] {
  const tips: string[] = [];
  
  if (!goal) return tips;
  
  switch (goal) {
    case "LOSE_FAT":
      tips.push("Focus on protein-rich meals to maintain muscle while in a calorie deficit");
      tips.push("Aim for 10,000 steps daily to boost calorie burn");
      tips.push("Stay hydrated - sometimes thirst feels like hunger");
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

