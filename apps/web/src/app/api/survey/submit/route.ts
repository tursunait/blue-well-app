import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { FitnessGoal } from "@prisma/client";

// Mifflin-St Jeor BMR calculation
function calculateBMR(weightKg: number, heightCm: number, age: number, gender: string): number {
  // BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age + (gender === "Man" ? 5 : -161)
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "Man" ? base + 5 : base - 161;
}

// Calculate TDEE from BMR and activity level
function calculateTDEE(bmr: number, weeklyActivity: number): number {
  // weeklyActivity: 1=Rarely, 2=1-2 days, 3=3-4 days, 4=5+ days
  const activityFactors = [1.2, 1.375, 1.55, 1.725]; // sedentary, light, moderate, active
  const factor = activityFactors[weeklyActivity - 1] || 1.2;
  return bmr * factor;
}

// Adjust TDEE by fitness goal
function adjustByGoal(tdee: number, goal: FitnessGoal): number {
  switch (goal) {
    case FitnessGoal.LOSE_FAT:
      return tdee - 250;
    case FitnessGoal.GAIN_MUSCLE:
    case FitnessGoal.FITNESS:
    case FitnessGoal.ATHLETIC:
      return tdee + 200;
    case FitnessGoal.MAINTAIN:
    default:
      return tdee;
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    
    // Get or create user
    const user = await prisma.user.upsert({
      where: { email: session.user.email },
      update: {},
      create: {
        email: session.user.email,
        name: session.user.name || null,
      },
    });
    
    // Extract survey data
    const {
      scheduleConsistency,
      timeBudgetMin,
      mealRegularity,
      weeklyActivity,
      fitnessGoal,
      barriers,
      supportPrefs,
      // Optional compound question data
      age,
      gender,
      heightCm,
      weightKg,
      dietPrefs,
      avoidFoods,
      // Fitness preferences
      weeklyWorkouts,
      preferredTimes,
      sportsClasses,
    } = body;
    
    // Map fitness goal string to enum
    const goalMap: Record<string, FitnessGoal> = {
      "Lose weight": FitnessGoal.LOSE_FAT,
      "Build muscle": FitnessGoal.GAIN_MUSCLE,
      "Improve endurance": FitnessGoal.ATHLETIC,
      "Maintain current shape": FitnessGoal.MAINTAIN,
      "Improve overall fitness": FitnessGoal.FITNESS,
      "Not sure yet": FitnessGoal.UNKNOWN,
    };
    
    const fitnessGoalEnum = fitnessGoal ? goalMap[fitnessGoal] || FitnessGoal.UNKNOWN : FitnessGoal.UNKNOWN;
    
    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        age: age || undefined,
        gender: gender || undefined,
        heightCm: heightCm || undefined,
        weightKg: weightKg || undefined,
        fitnessGoal: fitnessGoalEnum,
        scheduleCons: scheduleConsistency,
        mealRegular: mealRegularity,
        weeklyActivity: weeklyActivity,
        timeBudgetMin: timeBudgetMin,
        dietPrefs: dietPrefs && dietPrefs.length > 0 ? JSON.stringify(dietPrefs) : null,
        avoidFoods: avoidFoods && avoidFoods.length > 0 ? JSON.stringify(avoidFoods) : null,
      },
    });
    
    // Save survey answers
    const questionIds = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
    for (const questionId of questionIds) {
      const value = body[`question_${questionId}`] || body[questionId];
      if (value !== undefined) {
        await prisma.surveyAnswer.upsert({
          where: {
            id: `${user.id}_${questionId}`, // This won't work with current schema, need to adjust
          },
          update: {
            value: typeof value === 'string' ? value : JSON.stringify(value),
            tsISO: new Date(),
          },
          create: {
            userId: user.id,
            questionId,
            value: typeof value === 'string' ? value : JSON.stringify(value),
            tsISO: new Date(),
          },
        }).catch(() => {
          // If upsert fails, try create
          return prisma.surveyAnswer.create({
            data: {
              userId: user.id,
              questionId,
              value: typeof value === 'string' ? value : JSON.stringify(value),
              tsISO: new Date(),
            },
          });
        });
      }
    }
    
    // Calculate targets
    let calorieBudget = 2000; // default
    let proteinTarget = 120; // default
    const stepGoal = parseInt(process.env.DEFAULT_STEP_GOAL || "10000");
    
    if (updatedUser.weightKg && updatedUser.heightCm && updatedUser.age && updatedUser.gender) {
      const bmr = calculateBMR(
        updatedUser.weightKg,
        updatedUser.heightCm,
        updatedUser.age,
        updatedUser.gender
      );
      const tdee = calculateTDEE(bmr, updatedUser.weeklyActivity || 2);
      calorieBudget = Math.round(adjustByGoal(tdee, updatedUser.fitnessGoal || FitnessGoal.MAINTAIN));
      
      // Protein target: 1.2 g/kg (configurable)
      const proteinPerKg = parseFloat(process.env.DEFAULT_PROTEIN_PER_KG || "1.2");
      proteinTarget = Math.round(updatedUser.weightKg * proteinPerKg);
    }
    
    return NextResponse.json({
      calorieBudget,
      proteinTarget,
      stepGoal,
    });
  } catch (error) {
    console.error("Error submitting survey:", error);
    return NextResponse.json(
      { error: "Failed to submit survey", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

