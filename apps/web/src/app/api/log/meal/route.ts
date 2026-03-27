import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { getUserId, getDevUser } from "@/lib/auth-dev";

export async function POST(request: NextRequest) {
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
      where: { id: userId },
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
    
    // Validate required fields - allow 0 calories but not null/undefined
    if (finalCalories === null || finalCalories === undefined || !finalName) {
      console.error("[log/meal] Validation failed:", {
        finalCalories,
        finalName,
        receivedBody: { calories, itemName, proteinG, carbsG, fatG },
      });
      return NextResponse.json(
        { error: "Missing required fields: calories and itemName", details: `calories: ${finalCalories}, itemName: ${finalName}` },
        { status: 400 }
      );
    }
    
    // Create food log with exact restaurant name from database
    // Ensure all numeric values are properly set (allow 0, but not null for required fields)
    // Convert calories to Int (schema requires Int, not Float)
    console.log("[log/meal] Creating food log with data:", {
      userId: user.id,
      itemName: finalName,
      calories: finalCalories,
      caloriesRounded: Math.round(finalCalories),
      proteinG: finalProtein,
      carbsG: finalCarbs,
      fatG: finalFat,
      source: menuItemId ? "MENU_PICK" : source,
    });
    
    const foodLog = await prisma.foodLog.create({
      data: {
        userId: user.id,
        itemName: finalName,
        restaurant: finalRestaurant || null, // EXACT restaurant name from MenuVendor
        menuItemId: menuItemId || null, // Link to MenuItem if from database
        calories: Math.round(finalCalories), // Convert to Int as required by schema
        proteinG: finalProtein ?? null,
        carbsG: finalCarbs ?? null,
        fatG: finalFat ?? null,
        notes: notes || null,
        source: menuItemId ? "MENU_PICK" : source,
        ts: new Date(),
      },
    });
    
    console.log("[log/meal] Food log created successfully:", {
      id: foodLog.id,
      itemName: foodLog.itemName,
      calories: foodLog.calories,
      userId: foodLog.userId,
    });
    
    // Calculate today's totals using shared utility (ensures consistency)
    const { calculateTodayNutrition } = await import("@/lib/nutrition-calculations");
    const totals = await calculateTodayNutrition(user.id);
    
    return NextResponse.json({
      id: foodLog.id,
      totals,
    });
  } catch (error) {
    console.error("[log/meal] Error logging meal:", error);
    
    let errorMessage = "Failed to log meal";
    let errorDetails: any = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      };
      
      // Check for Prisma errors
      if (error.message.includes("Unique constraint") || error.message.includes("P2002")) {
        errorMessage = "This meal has already been logged";
      } else if (error.message.includes("Foreign key") || error.message.includes("P2003")) {
        errorMessage = "Invalid user or menu item reference";
      } else if (error.message.includes("Record to create") || error.message.includes("P2011")) {
        errorMessage = "Missing required fields in database";
      }
    } else {
      errorDetails = { error: String(error) };
    }
    
    console.error("[log/meal] Error details:", errorDetails);
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error),
        ...errorDetails,
      },
      { status: 500 }
    );
  }
}

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
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch today's food logs
    const foodLogs = await prisma.foodLog.findMany({
      where: {
        userId: userId,
        ts: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        ts: "desc",
      },
    });

    return NextResponse.json(foodLogs);
  } catch (error) {
    console.error("Error fetching food logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch food logs", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

