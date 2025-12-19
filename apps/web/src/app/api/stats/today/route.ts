import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { getUserId, getDevUser } from "@/lib/auth-dev";
import { calculateDailyTargets } from "@/lib/targets";
import { parseJsonArray } from "@/lib/sqlite-utils";

export async function GET(request: NextRequest) {
  // Get user ID - works in both dev and prod mode
  const session = await getServerSession(authOptions);
  let userId = await getUserId(session);
  
  // Fallback: if no user ID and in dev mode, try to get dev user
  if (!userId) {
    try {
      userId = await getDevUser();
    } catch (error) {
      console.error("Error getting dev user:", error);
    }
  }
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Get user context for targets
    const targets = calculateDailyTargets(user);
    
    // Calculate today's boundaries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    // Use shared calculation utilities for consistency
    const {
      calculateTodayNutrition,
      calculateTodayCaloriesBurned,
      calculateTodaySteps,
    } = await import("@/lib/nutrition-calculations");
    
    // Calculate totals using shared utilities (single source of truth)
    const nutrition = await calculateTodayNutrition(user.id);
    const caloriesConsumed = nutrition.calories;
    const proteinConsumed = nutrition.proteinG;
    const caloriesBurned = await calculateTodayCaloriesBurned(user.id);
    const steps = await calculateTodaySteps(user.id);
    
    const stepGoal = parseInt(process.env.DEFAULT_STEP_GOAL || "10000");
    
    // Calculate remaining
    const caloriesRemaining = Math.max(0, targets.kcal - caloriesConsumed + caloriesBurned);
    const proteinRemaining = Math.max(0, targets.protein_g - proteinConsumed);
    
    const stats = {
      calories: {
        consumed: caloriesConsumed,
        goal: targets.kcal,
        remaining: caloriesRemaining,
        burned: caloriesBurned,
      },
      protein: {
        consumed: proteinConsumed,
        goal: targets.protein_g,
        remaining: proteinRemaining,
      },
      steps: {
        current: steps,
        goal: stepGoal,
        remaining: Math.max(0, stepGoal - steps),
      },
    };

    // Generate AI-powered insights (non-blocking - don't fail if AI is unavailable)
    let insights: Record<string, unknown> = {};
    let aiInsightsFallback = false;
    
    try {
      const { generateStatsInsights } = await import("@/ai/stats-insights-ai");
      const dietPrefs = parseJsonArray<string>(user.dietPrefs);
      const insightsResult = await generateStatsInsights(user.id, {
        ...stats,
        dietPrefs,
      });
      insights = insightsResult as Record<string, unknown>;
      aiInsightsFallback = insightsResult.aiInsightsFallback ?? false;
    } catch (error: any) {
      const is429 = error?.status === 429 || error?.code === "insufficient_quota";
      console.warn("[stats/today] AI insights failed:", is429 ? "quota/429" : error?.message || error);
      
      // Return fallback insights
      insights = {
        summary: "AI insights are temporarily unavailable.",
        recommendations: [],
        encouragement: "Keep tracking your progress!",
        aiInsightsFallback: true,
      };
      aiInsightsFallback = true;
    }
    
    return NextResponse.json({
      ...stats,
      insights,
      aiInsightsFallback, // Flag for UI to show degraded state if needed
    });
  } catch (error) {
    console.error("Error fetching today's stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

