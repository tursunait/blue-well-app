import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const {
      menuItemId,
      itemName,
      calories,
      proteinG,
      carbsG,
      fatG,
      notes,
      source = "MANUAL",
    } = body;
    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    // If menuItemId provided, fetch nutrition from DB
    let finalCalories = calories;
    let finalProtein = proteinG;
    let finalCarbs = carbsG;
    let finalFat = fatG;
    let finalName = itemName;
    
    if (menuItemId) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: menuItemId },
      });
      
      if (menuItem) {
        finalCalories = menuItem.calories || calories;
        finalProtein = menuItem.proteinG || proteinG;
        finalCarbs = menuItem.carbsG || carbsG;
        finalFat = menuItem.fatG || fatG;
        finalName = menuItem.name;
      }
    }
    
    if (!finalCalories || !finalName) {
      return NextResponse.json(
        { error: "Missing required fields: calories and itemName" },
        { status: 400 }
      );
    }
    
    // Create food log
    const foodLog = await prisma.foodLog.create({
      data: {
        userId: user.id,
        itemName: finalName,
        calories: finalCalories,
        proteinG: finalProtein,
        carbsG: finalCarbs,
        fatG: finalFat,
        notes: notes || null,
        source: menuItemId ? "MENU_PICK" : source,
        ts: new Date(),
      },
    });
    
    // Calculate today's totals
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const todayLogs = await prisma.foodLog.findMany({
      where: {
        userId: user.id,
        ts: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });
    
    const totals = todayLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + (log.calories || 0),
        proteinG: acc.proteinG + (log.proteinG || 0),
        carbsG: acc.carbsG + (log.carbsG || 0),
        fatG: acc.fatG + (log.fatG || 0),
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    );
    
    return NextResponse.json({
      id: foodLog.id,
      totals,
    });
  } catch (error) {
    console.error("Error logging meal:", error);
    return NextResponse.json(
      { error: "Failed to log meal", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

