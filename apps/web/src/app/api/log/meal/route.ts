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
    
    // If menuItemId provided, fetch nutrition and restaurant from DB
    let finalCalories = calories;
    let finalProtein = proteinG;
    let finalCarbs = carbsG;
    let finalFat = fatG;
    let finalName = itemName;
    let finalRestaurant: string | undefined = undefined;
    
    if (menuItemId) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: menuItemId },
        include: { vendor: true },
      });
      
      if (menuItem) {
        finalCalories = menuItem.calories || calories;
        finalProtein = menuItem.proteinG || proteinG;
        finalCarbs = menuItem.carbsG || carbsG;
        finalFat = menuItem.fatG || fatG;
        finalName = menuItem.name;
        finalRestaurant = menuItem.vendor.name; // EXACT restaurant name from database
      }
    }
    
    // Also accept restaurant from body if provided (for manual entry)
    const restaurantFromBody = body.restaurant as string | undefined;
    if (restaurantFromBody) {
      finalRestaurant = restaurantFromBody;
    }
    
    if (!finalCalories || !finalName) {
      return NextResponse.json(
        { error: "Missing required fields: calories and itemName" },
        { status: 400 }
      );
    }
    
    // Create food log with exact restaurant name from database
    const foodLog = await prisma.foodLog.create({
      data: {
        userId: user.id,
        itemName: finalName,
        restaurant: finalRestaurant || null, // EXACT restaurant name from MenuVendor
        menuItemId: menuItemId || null, // Link to MenuItem if from database
        calories: finalCalories,
        proteinG: finalProtein,
        carbsG: finalCarbs,
        fatG: finalFat,
        notes: notes || null,
        source: menuItemId ? "MENU_PICK" : source,
        ts: new Date(),
      },
    });
    
    // Calculate today's totals using shared utility (ensures consistency)
    const { calculateTodayNutrition } = await import("@/lib/nutrition-calculations");
    const totals = await calculateTodayNutrition(user.id);
    
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

