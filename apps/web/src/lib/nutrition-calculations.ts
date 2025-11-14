/**
 * Shared nutrition calculation utilities
 * Ensures consistency across Home and Plan pages
 */

import { prisma } from "@/lib/prisma";

export interface NutritionTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Calculate today's nutrition totals from FoodLog table
 * Single source of truth for all calculations
 */
export async function calculateTodayNutrition(userId: string): Promise<NutritionTotals> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const foodLogs = await prisma.foodLog.findMany({
    where: {
      userId,
      ts: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  // Debug logging (only in development)
  if (process.env.NODE_ENV === "development") {
    console.log(`[calculateTodayNutrition] User: ${userId}, Found ${foodLogs.length} food logs today`);
    if (foodLogs.length > 0) {
      console.log(`[calculateTodayNutrition] Sample log:`, {
        id: foodLogs[0].id,
        itemName: foodLogs[0].itemName,
        calories: foodLogs[0].calories,
        proteinG: foodLogs[0].proteinG,
        ts: foodLogs[0].ts,
      });
    }
  }

  const totals = foodLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      proteinG: acc.proteinG + (log.proteinG || 0),
      carbsG: acc.carbsG + (log.carbsG || 0),
      fatG: acc.fatG + (log.fatG || 0),
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  if (process.env.NODE_ENV === "development") {
    console.log(`[calculateTodayNutrition] Calculated totals:`, totals);
  }

  return totals;
}

/**
 * Calculate today's calories burned from ActivityLog table
 */
export async function calculateTodayCaloriesBurned(userId: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const activityLogs = await prisma.activityLog.findMany({
    where: {
      userId,
      ts: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  return activityLogs.reduce((sum, log) => sum + (log.kcalBurn || 0), 0);
}

/**
 * Calculate today's steps from ActivityLog table
 */
export async function calculateTodaySteps(userId: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const activityLogs = await prisma.activityLog.findMany({
    where: {
      userId,
      ts: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
  });

  return activityLogs.reduce((sum, log) => {
    const activityLower = log.activity.toLowerCase();
    if (activityLower.includes("walk") || activityLower.includes("run")) {
      // Rough estimate: 1 minute of walking = ~100 steps, running = ~150 steps
      const stepsPerMin = activityLower.includes("run") ? 150 : 100;
      return sum + (log.durationMin || 0) * stepsPerMin;
    }
    return sum;
  }, 0);
}

