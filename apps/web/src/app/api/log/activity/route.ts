import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";

// MET (Metabolic Equivalent of Task) lookup table
const MET_VALUES: Record<string, number> = {
  yoga: 3.0,
  walking: 3.5,
  running: 9.8,
  cycling: 7.5,
  swimming: 7.0,
  strength: 5.0,
  hiit: 8.0,
  pilates: 3.5,
  default: 4.0,
};

/**
 * Estimate calories burned using MET values
 */
function estimateCaloriesBurned(
  activity: string,
  durationMin: number,
  weightKg: number
): number {
  const activityLower = activity.toLowerCase();
  let met = MET_VALUES.default;
  
  for (const [key, value] of Object.entries(MET_VALUES)) {
    if (activityLower.includes(key)) {
      met = value;
      break;
    }
  }
  
  // Calories = MET * weight(kg) * duration(hours)
  return Math.round(met * weightKg * (durationMin / 60));
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const {
      activity,
      durationMin,
      intensity,
      source = "MANUAL",
      kcalBurn,
    } = body;
    
    if (!activity) {
      return NextResponse.json({ error: "Missing activity" }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // Estimate calories if not provided
    let finalKcalBurn = kcalBurn;
    if (!finalKcalBurn && user.weightKg && durationMin) {
      finalKcalBurn = estimateCaloriesBurned(activity, durationMin, user.weightKg);
    }
    
    // Create activity log
    const activityLog = await prisma.activityLog.create({
      data: {
        userId: user.id,
        activity,
        durationMin: durationMin || null,
        intensity: intensity || null,
        kcalBurn: finalKcalBurn || null,
        source,
        ts: new Date(),
      },
    });
    
    return NextResponse.json({
      id: activityLog.id,
      kcalBurn: finalKcalBurn,
    });
  } catch (error) {
    console.error("Error logging activity:", error);
    return NextResponse.json(
      { error: "Failed to log activity", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

