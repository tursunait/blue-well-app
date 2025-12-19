import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { getUserId, getDevUser } from "@/lib/auth-dev";

/**
 * Reset survey/onboarding data for the current user
 * POST /api/survey/reset
 */
export async function POST(request: NextRequest) {
  try {
    // Get user ID
    const session = await getServerSession(authOptions);
    let userId = await getUserId(session);
    
    if (!userId) {
      try {
        userId = await getDevUser();
      } catch (error) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete survey answers
    const deletedAnswers = await prisma.surveyAnswer.deleteMany({
      where: { userId },
    });

    // Reset user profile data
    await prisma.user.update({
      where: { id: userId },
      data: {
        age: null,
        gender: null,
        heightCm: null,
        weightKg: null,
        fitnessGoal: null,
        reminderPref: null,
        scheduleCons: null,
        mealRegular: null,
        weeklyActivity: null,
        timeBudgetMin: null,
        dietPrefs: null,
        avoidFoods: null,
      },
    });

    // Delete Profile if exists
    await prisma.profile.deleteMany({
      where: { userId },
    });

    // Delete AI recommendations/plans
    await prisma.aIRec.deleteMany({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      message: "Survey data reset successfully",
      deleted: {
        answers: deletedAnswers.count,
      },
    });
  } catch (error: any) {
    console.error("Error resetting survey:", error);
    return NextResponse.json(
      {
        error: "Failed to reset survey",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

