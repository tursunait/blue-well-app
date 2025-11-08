import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { generatePlanForWindow } from "@/ai/planner";

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
        payload: plan as any,
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

