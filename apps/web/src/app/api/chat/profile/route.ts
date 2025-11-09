import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-dev";
import { getUserContext } from "@/ai/planner-tools";
import { parseJsonArray } from "@/lib/sqlite-utils";

const SURVEY_LABELS: Record<string, string> = {
  "1": "Personal details",
  "2": "Primary wellness goal",
  "3": "Weekly activity level",
  "4": "Fitness preferences",
  "5": "Schedule consistency",
  "6": "Daily time budget",
  "7": "Meal regularity",
  "8": "Monthly food budget",
  "9": "Biggest barriers",
  "10": "Preferred support",
};

function safeParse(value: string | null | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = await getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user, profile, surveyAnswers] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.profile.findUnique({ where: { userId } }),
      prisma.surveyAnswer.findMany({
        where: { userId },
        select: { questionId: true, value: true, answerJson: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let plannerContext: Awaited<ReturnType<typeof getUserContext>> | null = null;
    try {
      plannerContext = await getUserContext(userId);
    } catch (contextError) {
      console.warn("getUserContext failed for chat persona:", contextError);
    }

    const dietPrefs = parseJsonArray(user?.dietPrefs);
    const defaultContext = {
      calorieBudget: plannerContext?.calorieBudget ?? 2000,
      proteinTarget: plannerContext?.proteinTarget ?? 120,
      timeBudgetMin: plannerContext?.timeBudgetMin ?? user.timeBudgetMin ?? profile?.timeBudgetMin ?? 20,
      weeklyActivity: plannerContext?.weeklyActivity ?? user.weeklyActivity ?? 2,
    };
    const persona = {
      userId,
      name: user.name || null,
      email: user.email || null,
      primaryGoal: profile?.primaryGoal || user.fitnessGoal || null,
      fitnessGoal: user.fitnessGoal || null,
      weeklyWorkouts: profile?.weeklyWorkouts || null,
      dietPrefs: dietPrefs.length ? dietPrefs : parseJsonArray(profile?.dietPrefs),
      avoidFoods: parseJsonArray(user?.avoidFoods),
      allergies: parseJsonArray(profile?.allergies),
      timePrefs: parseJsonArray(profile?.timePrefs),
      reminderPref: user.reminderPref || null,
      scheduleCons: user.scheduleCons ?? profile?.scheduleCons ?? null,
      mealRegular: user.mealRegular ?? profile?.mealRegular ?? null,
      timeBudgetMin: defaultContext.timeBudgetMin,
      weeklyActivity: defaultContext.weeklyActivity,
      calorieBudget: defaultContext.calorieBudget,
      proteinTarget: defaultContext.proteinTarget,
      weightKg: user.weightKg ?? profile?.weightKg ?? null,
      heightCm: user.heightCm ?? profile?.heightCm ?? null,
      age: user.age ?? profile?.age ?? null,
      gender: user.gender ?? profile?.gender ?? null,
    };

    const survey = surveyAnswers.map((entry) => ({
      questionId: entry.questionId,
      label: SURVEY_LABELS[entry.questionId] || null,
      answer: safeParse(entry.answerJson || entry.value),
    }));

    return NextResponse.json({
      persona,
      surveyAnswers: survey,
    });
  } catch (error) {
    console.error("Error loading chat profile:", error);
    return NextResponse.json({ error: "Failed to load chat profile" }, { status: 500 });
  }
}
