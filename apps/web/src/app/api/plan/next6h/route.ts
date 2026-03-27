import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { generatePlanForWindow } from "@/ai/planner";
import { getUserId, getDevUser } from "@/lib/auth-dev";

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
    
    // Generate plan for next 6 hours
    const plan = await generatePlanForWindow({
      userId: user.id,
      window: "NEXT_6_HOURS",
    });
    
    // Save recommendation
    await prisma.recommendation.create({
      data: {
        userId: user.id,
        scope: "NEXT_6_HOURS",
        payload: JSON.stringify(plan),
        rationale: plan.rationale,
        date: new Date(),
      },
    });
    
    return NextResponse.json(plan);
  } catch (error) {
    console.error("Error generating plan:", error);
    return NextResponse.json(
      { error: "Failed to generate plan", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

