import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import OpenAI from "openai";

import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { calculateDailyTargets } from "@/lib/targets";
import { groundMeals, groundWorkouts } from "@/lib/grounding";
import { getUserId, getDevUser } from "@/lib/auth-dev";
import { parseJsonArray } from "@/lib/sqlite-utils";

// Runtime check for Prisma model availability
function ensurePrismaModel(modelName: string) {
  if (!prisma) {
    throw new Error("Prisma client is not initialized. Check DATABASE_URL environment variable.");
  }
  
  // Get available models (exclude Prisma internal methods)
  const availableModels = Object.keys(prisma).filter(
    (k) => !k.startsWith("$") && !k.startsWith("_") && typeof (prisma as any)[k] === "object"
  );
  
  const model = (prisma as any)[modelName];
  if (!model || typeof model.findFirst !== "function") {
    const errorMsg = `Prisma model '${modelName}' not found or invalid. 
Available models: ${availableModels.join(", ") || "none found"}
This usually means:
1. Prisma client needs regeneration: run 'pnpm prisma generate'
2. DATABASE_URL is not set correctly in .env.local
3. Database schema changed but client wasn't regenerated`;
    throw new Error(errorMsg);
  }
  return model;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PlanRequestBody {
  userId?: string | null;
  day?: string;
  refresh?: boolean;
}

type PlanResultPayload = {
  day: string;
  targets: { kcal: number; protein_g: number };
  meals: Array<{
    id: string;
    item: string;
    restaurant: string;
    calories: number | null;
    protein_g: number | null;
    time?: string;
    portion_note?: string;
  }>;
  workouts: Array<{
    id: string;
    title: string;
    location?: string | null;
    start_time?: string;
    end_time?: string;
    intensity?: string;
    note?: string;
  }>;
  model: string;
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

async function resolveUserId(requestBody: PlanRequestBody, request: NextRequest): Promise<string | null> {
  if (requestBody.userId) {
    return requestBody.userId;
  }

  const session = await getServerSession(authOptions);
  let userId: string | null = null;

  try {
    userId = await getUserId(session);
  } catch (error) {
    console.warn("[plan/generate] getUserId failed:", error);
  }

  if (!userId) {
    try {
      userId = await getDevUser();
    } catch (error) {
      console.warn("[plan/generate] getDevUser failed:", error);
    }
  }

  return userId;
}

async function loadDiningItems(userId: string, dietPrefs: string[], avoidFoods: string[]) {
  // First get Duke Dining vendors (more reliable than nested query in SQLite)
  const vendors = await prisma.menuVendor.findMany({
    where: { source: "DUKE_DINING" },
  });

  const vendorIds = vendors.map((v: { id: string }) => v.id);
  
  if (vendorIds.length === 0) {
    console.log(`[loadDiningItems] No Duke Dining vendors found`);
    return [];
  }

  const baseItems = await prisma.menuItem.findMany({
    where: {
      vendorId: { in: vendorIds },
      calories: { not: null },
      proteinG: { not: null },
    },
    include: { vendor: true },
    take: 60,
  });

  console.log(`[loadDiningItems] Found ${baseItems.length} base items with nutrition data (from ${vendorIds.length} vendors)`);

  // Filter by diet preferences (but be lenient - if filter removes everything, use baseItems)
  let filteredByDiet = baseItems;
  if (dietPrefs.length > 0) {
    filteredByDiet = baseItems.filter((item: typeof baseItems[0]) => {
      const tags = parseJsonArray<string>(item.tags).map((tag) => tag.toLowerCase());
      // Check if any diet preference matches any tag (more lenient than "every")
      // Also check item name/description for diet keywords
      const nameDesc = `${item.name} ${item.description || ""}`.toLowerCase();
      return dietPrefs.some((pref) => {
        const prefLower = pref.toLowerCase();
        return (
          tags.some((tag) => tag.includes(prefLower)) ||
          nameDesc.includes(prefLower)
        );
      });
    });
    
    // If diet filter removed everything, warn but use baseItems
    if (filteredByDiet.length === 0 && baseItems.length > 0) {
      console.warn(`[loadDiningItems] Diet filter removed all items. Using baseItems instead. Prefs: ${JSON.stringify(dietPrefs)}`);
      filteredByDiet = baseItems;
    }
  }

  console.log(`[loadDiningItems] After diet filter (${dietPrefs.length} prefs): ${filteredByDiet.length} items`);

  const finalItems = filteredByDiet.filter((item: typeof baseItems[0]) => {
    const avoidLower = avoidFoods.map((food) => food.toLowerCase());
    const nameLower = item.name.toLowerCase();
    const descLower = (item.description || "").toLowerCase();
    return !avoidLower.some((avoid) => nameLower.includes(avoid) || descLower.includes(avoid));
  });

  console.log(`[loadDiningItems] After avoid foods filter (${avoidFoods.length} foods): ${finalItems.length} items`);

  // Always return baseItems if finalItems is empty (to ensure we have something to work with)
  const result = (finalItems.length > 0 ? finalItems : baseItems).slice(0, 20);
  console.log(`[loadDiningItems] Returning ${result.length} items for plan generation`);

  return result.map((item: typeof baseItems[0]) => ({
    id: item.id,
    restaurant: item.vendor?.name ?? "Duke Dining",
    item: item.name,
    calories: item.calories,
    protein_g: item.proteinG,
  }));
}

async function loadRecClasses(dayStart: Date, dayEnd: Date) {
  const classes = await prisma.fitnessClass.findMany({
    where: {
      startTime: { gte: dayStart, lte: dayEnd },
      source: "DUKE_REC",
    },
    orderBy: { startTime: "asc" },
    take: 20,
  });

  if (classes.length > 0) {
    return classes.map((cls: typeof classes[0]) => ({
      id: cls.id,
      title: cls.title,
      start_time: cls.startTime.toISOString(),
      end_time: cls.endTime?.toISOString(),
      location: cls.location,
      intensity: cls.intensity,
    }));
  }

  // Fallback: next available classes
  const fallback = await prisma.fitnessClass.findMany({
    where: { source: "DUKE_REC" },
    orderBy: { startTime: "asc" },
    take: 10,
  });

  return fallback.map((cls: typeof fallback[0]) => ({
    id: cls.id,
    title: cls.title,
    start_time: cls.startTime.toISOString(),
    end_time: cls.endTime?.toISOString(),
    location: cls.location,
    intensity: cls.intensity,
  }));
}

function buildPlanPrompt({
  profile,
  targets,
  diningItems,
  recClasses,
}: {
  profile: Record<string, unknown>;
  targets: { kcal: number; protein_g: number };
  diningItems: Array<{ id: string; restaurant: string; item: string; calories: number | null; protein_g: number | null }>;
  recClasses: Array<{ id: string; title: string; start_time: string; location: string | null; intensity: string | null }>;
}) {
  return [
    {
      role: "system" as const,
      content: [
        "You are BlueWell's daily wellness planner.",
        "You must ONLY use the provided dining_items and rec_classes IDs in your response.",
        "Respect dietary restrictions, allergies, and time availability.",
        "Provide suggestions, not prescriptions. Avoid medical language.",
        "Keep calories within ±500 kcal of the provided target. Protein should support the goal.",
        "If insufficient information, suggest requesting more detail instead of inventing items.",
        "Output strict JSON with keys {\"meals\": [...], \"workouts\": [...]}.",
        "For each meal and workout, include the referenced `id` and optional notes.",
      ].join(" "),
    },
    {
      role: "user" as const,
      content: JSON.stringify({
        profile,
        targets,
        dining_items: diningItems,
        rec_classes: recClasses,
        instructions: {
          meals_required: 3,
          include_times: true,
          meal_time_guidance: ["07:00-09:30", "11:30-14:00", "17:30-20:30"],
          tone: "Supportive and gentle",
        },
        schema: {
          meals: [{ id: "string", time: "HH:MM", portion_note: "optional string" }],
          workouts: [{ id: "string", intensity: "optional string", note: "optional string" }],
        },
      }),
    },
  ];
}

function buildFallbackPlan(
  dayStart: Date,
  targets: { kcal: number; protein_g: number },
  diningItems: Array<{
    id: string;
    restaurant: string;
    item: string;
    calories: number | null;
    protein_g: number | null;
  }>,
  recClasses: Array<{
    id: string;
    title: string;
    start_time: string;
    end_time?: string | null;
    location?: string | null;
    intensity?: string | null;
  }>
): PlanResultPayload {
  const mealTimes = ["08:00", "12:30", "18:30"];
  const meals = diningItems.slice(0, 3).map((item, index) => ({
    id: item.id,
    item: item.item,
    restaurant: item.restaurant,
    calories: item.calories,
    protein_g: item.protein_g,
    time: `${dayStart.toISOString().split("T")[0]}T${mealTimes[index]}:00`,
    portion_note: "Enjoy mindfully and pair with water.",
  }));

  const workouts = recClasses.slice(0, 1).map((cls) => ({
    id: cls.id,
    title: cls.title,
    location: cls.location ?? "Duke Rec",
    start_time: cls.start_time,
    end_time: cls.end_time ?? undefined,
    intensity: cls.intensity ?? "moderate",
    note: "Bring water and listen to your body.",
  }));

  return {
    day: dayStart.toISOString(),
    targets,
    meals,
    workouts,
    model: "fallback",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as PlanRequestBody;
    const userId = await resolveUserId(body, request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dayInput = body.day ? new Date(body.day) : new Date();
    if (Number.isNaN(dayInput.valueOf())) {
      return NextResponse.json({ error: "Invalid day format" }, { status: 400 });
    }

    const dayStart = startOfDay(dayInput);
    const dayEnd = endOfDay(dayInput);
    const refresh = Boolean(body.refresh);

    // Ensure Prisma models are available (with better error handling)
    try {
      ensurePrismaModel("aIRec");
      ensurePrismaModel("user");
    } catch (modelError: any) {
      console.error("[plan/generate] Prisma model check failed:", modelError.message);
      // Try to continue anyway - the actual query will fail with a clearer error
    }

    if (!refresh) {
      try {
        const cached = await prisma.aIRec.findFirst({
          where: {
            userId,
            kind: "plan",
            day: dayStart,
          },
        });

        if (cached) {
          try {
            const payload = JSON.parse(cached.payload);
            return NextResponse.json(payload);
          } catch (error) {
            console.warn("[plan/generate] Failed to parse cached payload, regenerating.", error);
          }
        }
      } catch (error: any) {
        console.warn("[plan/generate] Failed to check cache, continuing with generation:", error?.message || error);
        // Continue to generate new plan
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targets = calculateDailyTargets(user);
    const dietPrefs = parseJsonArray<string>(user.dietPrefs);
    const avoidFoods = parseJsonArray<string>(user.avoidFoods);

    const diningItems = await loadDiningItems(userId, dietPrefs, avoidFoods);
    const recClasses = await loadRecClasses(dayStart, dayEnd);

    if (diningItems.length === 0) {
      // Diagnostic: Check what's actually in the database (use same query pattern as loadDiningItems)
      const diagnosticVendors = await prisma.menuVendor.findMany({
        where: { source: "DUKE_DINING" },
      });
      const diagnosticVendorIds = diagnosticVendors.map((v: { id: string }) => v.id);
      
      const totalItems = diagnosticVendorIds.length > 0 
        ? await prisma.menuItem.count({
            where: { vendorId: { in: diagnosticVendorIds } },
          })
        : 0;
      
      const itemsWithNutrition = diagnosticVendorIds.length > 0
        ? await prisma.menuItem.count({
            where: {
              vendorId: { in: diagnosticVendorIds },
              calories: { not: null },
              proteinG: { not: null },
            },
          })
        : 0;
      
      console.error(`[plan/generate] No dining items found. Total Duke items: ${totalItems}, With nutrition: ${itemsWithNutrition}`);
      console.error(`[plan/generate] Vendors found: ${diagnosticVendors.length}, Vendor IDs: ${diagnosticVendorIds.length}`);
      console.error(`[plan/generate] Diet prefs: ${JSON.stringify(dietPrefs)}, Avoid foods: ${JSON.stringify(avoidFoods)}`);
      
      return NextResponse.json(
        { 
          error: "No dining items available. Import Duke Dining data first.",
          diagnostic: {
            vendorsFound: diagnosticVendors.length,
            totalDukeItems: totalItems,
            itemsWithNutrition,
            dietPrefs,
            avoidFoods,
            hint: itemsWithNutrition > 0 
              ? "Items exist but may be filtered out by diet preferences or avoid foods"
              : "No items with nutrition data found. Run the import script.",
          }
        },
        { status: 409 }
      );
    }

    const useFallback = !process.env.OPENAI_API_KEY;
    const fallbackPlan = () =>
      buildFallbackPlan(dayStart, targets, diningItems, recClasses);

    if (useFallback) {
      const resultPayload = fallbackPlan();

      try {
        await prisma.aIRec.upsert({
          where: {
            userId_day_kind: {
              userId,
              day: dayStart,
              kind: "plan",
            },
          },
          update: {
            payload: JSON.stringify(resultPayload),
            model: resultPayload.model,
            updatedAt: new Date(),
          },
          create: {
            userId,
            day: dayStart,
            kind: "plan",
            payload: JSON.stringify(resultPayload),
            model: resultPayload.model,
          },
        });
      } catch (dbError: any) {
        console.error("[plan/generate] Failed to save fallback plan to database:", dbError?.message || dbError);
        // Still return the plan even if DB save fails
      }

      return NextResponse.json(resultPayload);
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
    }

    let completionResult: PlanResultPayload | null = null;

    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const messages = buildPlanPrompt({
        profile: {
          age: user.age,
          gender: user.gender,
          height_cm: user.heightCm,
          weight_kg: user.weightKg,
          fitness_goal: user.fitnessGoal,
          weekly_activity: user.weeklyActivity,
          schedule_consistency: user.scheduleCons,
          meal_regular: user.mealRegular,
          diet_preferences: dietPrefs,
          avoid_foods: avoidFoods,
        },
        targets,
        diningItems,
        recClasses,
      });

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_DAILY_PLAN_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Received empty response from OpenAI");
      }

      const parsed = JSON.parse(content) as {
        meals?: Array<{ id: string; time?: string; portion_note?: string }>;
        workouts?: Array<{ id: string; intensity?: string; note?: string }>;
      };

      if (!parsed || !Array.isArray(parsed.meals) || !Array.isArray(parsed.workouts)) {
        throw new Error("Model output missing required fields.");
      }

      const groundedMeals = await groundMeals(parsed.meals);
      const groundedWorkouts = await groundWorkouts(parsed.workouts);

      completionResult = {
        day: dayStart.toISOString(),
        targets,
        meals: groundedMeals,
        workouts: groundedWorkouts,
        model: completion.model ?? "openai",
      };
    } catch (error) {
      console.warn("[plan/generate] OpenAI planner failed, using fallback.", error);
      completionResult = fallbackPlan();
    }

    const resultPayload = completionResult || fallbackPlan();

    try {
      await prisma.aIRec.upsert({
        where: {
          userId_day_kind: {
            userId,
            day: dayStart,
            kind: "plan",
          },
        },
        update: {
          payload: JSON.stringify(resultPayload),
          model: resultPayload.model,
          updatedAt: new Date(),
        },
        create: {
          userId,
          day: dayStart,
          kind: "plan",
          payload: JSON.stringify(resultPayload),
          model: resultPayload.model,
        },
      });
    } catch (dbError: any) {
      console.error("[plan/generate] Failed to save plan to database:", dbError?.message || dbError);
      // Still return the plan even if DB save fails
    }

    return NextResponse.json(resultPayload);
  } catch (error: any) {
    console.error("[plan/generate] Error generating plan:", error);
    
    // Provide more specific error messages
    if (error?.message?.includes("Prisma model")) {
      return NextResponse.json(
        {
          error: "Database configuration error",
          details: error.message,
          hint: "Run 'pnpm prisma generate' to regenerate Prisma client",
        },
        { status: 500 }
      );
    }
    
    if (error?.message?.includes("User not found") || error?.code === "P2025") {
      return NextResponse.json(
        {
          error: "User not found",
          details: "Please complete onboarding first",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to generate plan",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

