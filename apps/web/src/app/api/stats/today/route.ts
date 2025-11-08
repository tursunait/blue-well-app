import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getUserContext } from "@/ai/planner-tools";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Get user context for targets
    const context = await getUserContext(user.id);
    
    // Calculate today's boundaries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    // Get today's food logs
    const foodLogs = await prisma.foodLog.findMany({
      where: {
        userId: user.id,
        ts: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });
    
    // Get today's activity logs (for steps and calories burned)
    const activityLogs = await prisma.activityLog.findMany({
      where: {
        userId: user.id,
        ts: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });
    
    // Calculate totals
    const caloriesConsumed = foodLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
    const proteinConsumed = foodLogs.reduce((sum, log) => sum + (log.proteinG || 0), 0);
    const caloriesBurned = activityLogs.reduce((sum, log) => sum + (log.kcalBurn || 0), 0);
    
    // Calculate steps (from activity logs - walking/running activities)
    const steps = activityLogs.reduce((sum, log) => {
      const activityLower = log.activity.toLowerCase();
      if (activityLower.includes("walk") || activityLower.includes("run")) {
        // Rough estimate: 1 minute of walking = ~100 steps, running = ~150 steps
        const stepsPerMin = activityLower.includes("run") ? 150 : 100;
        return sum + (log.durationMin || 0) * stepsPerMin;
      }
      return sum;
    }, 0);
    
    const stepGoal = parseInt(process.env.DEFAULT_STEP_GOAL || "10000");
    
    // Calculate remaining
    const caloriesRemaining = Math.max(0, context.calorieBudget - caloriesConsumed + caloriesBurned);
    const proteinRemaining = Math.max(0, context.proteinTarget - proteinConsumed);
    
    return NextResponse.json({
      calories: {
        consumed: caloriesConsumed,
        goal: context.calorieBudget,
        remaining: caloriesRemaining,
        burned: caloriesBurned,
      },
      protein: {
        consumed: proteinConsumed,
        goal: context.proteinTarget,
        remaining: proteinRemaining,
      },
      steps: {
        current: steps,
        goal: stepGoal,
        remaining: Math.max(0, stepGoal - steps),
      },
    });
  } catch (error) {
    console.error("Error fetching today's stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

