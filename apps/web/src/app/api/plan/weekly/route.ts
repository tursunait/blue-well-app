import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { getUserContext, searchMenuItems, listRecClasses } from "@/ai/planner-tools";
import { getUserId, getDevUser } from "@/lib/auth-dev";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CHAT_MODEL = process.env.PLANNER_CHAT_MODEL || "gpt-4o-mini";

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
    
    const context = await getUserContext(user.id);
    
    // Calculate week boundaries
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Get available menu items
    const menuItems = await searchMenuItems({
      dietPrefs: context.dietPrefs,
      proteinMin: context.fitnessGoal === "GAIN_MUSCLE" ? 20 : undefined,
    });
    
    // Get available fitness classes
    const classes = await listRecClasses({
      from: weekStart.toISOString(),
      to: weekEnd.toISOString(),
    });
    
    // Generate weekly plan using AI
    const systemPrompt = `You are BlueWell's Weekly Planner. Create a 7-day meal and workout plan.

User context:
- Calorie budget: ${context.calorieBudget} kcal/day
- Protein target: ${context.proteinTarget}g/day
- Diet preferences: ${context.dietPrefs.join(", ") || "None"}
- Foods to avoid: ${context.avoidFoods.join(", ") || "None"}
- Fitness goal: ${user.fitnessGoal || "MAINTAIN"}
- Weekly activity level: ${context.weeklyActivity}
- Time budget: ${context.timeBudgetMin} min/day

Available menu items: ${JSON.stringify(menuItems.slice(0, 20))}
Available fitness classes: ${JSON.stringify(classes.slice(0, 20))}

Create a structured weekly plan with:
1. Daily meal suggestions (breakfast, lunch, dinner, snacks) with specific menu items
2. Daily workout suggestions (classes or activities)
3. Tips for achieving goals

Output as JSON with this structure:
{
  "meals": {
    "monday": [{ "meal": "breakfast", "item": {...}, "calories": 450, ... }, ...],
    "tuesday": [...],
    ...
  },
  "workouts": {
    "monday": [{ "title": "...", "type": "class|suggested", "duration": 30, ... }, ...],
    ...
  },
  "tips": ["tip1", "tip2", ...]
}`;

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate my weekly meal and workout plan." },
      ],
      response_format: { type: "json_object" },
    });
    
    const plan = JSON.parse(response.choices[0].message.content || "{}");
    
    // Save recommendation
    await prisma.recommendation.create({
      data: {
        userId: user.id,
        scope: "WEEK",
        payload: JSON.stringify(plan),
        rationale: `Weekly plan for ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`,
        date: new Date(),
      },
    });
    
    return NextResponse.json({
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      ...plan,
    });
  } catch (error) {
    console.error("Error generating weekly plan:", error);
    return NextResponse.json(
      { error: "Failed to generate weekly plan", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

