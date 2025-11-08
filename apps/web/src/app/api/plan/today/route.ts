import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { generatePlanForWindow } from "@/ai/planner";
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
      // Return existing plan
      return NextResponse.json(existing.payload);
    }
    
    // Generate new plan for today
    const plan = await generatePlanForWindow({
      userId: user.id,
      window: "TODAY",
    });
    
    // Get user context for additional info
    const context = await getUserContext(user.id);
    
    // Add goal achievement tips
    const goalTips = generateGoalTips(user.fitnessGoal, context);
    
    // Save recommendation
    await prisma.recommendation.create({
      data: {
        userId: user.id,
        scope: "TODAY",
        payload: { ...plan, goalTips } as any,
        rationale: plan.rationale,
        date: new Date(),
      },
    });
    
    return NextResponse.json({ ...plan, goalTips });
  } catch (error) {
    console.error("Error generating plan:", error);
    return NextResponse.json(
      { error: "Failed to generate plan", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
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

