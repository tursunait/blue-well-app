import { prisma } from "@/lib/prisma";
import { getQueryEmbedding, cosineSimilarity } from "./embeddings";

// Mifflin-St Jeor BMR calculation
function calculateBMR(weightKg: number, heightCm: number, age: number, gender: string): number {
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
function adjustByGoal(tdee: number, goal: string | null): number {
  if (!goal) return tdee;
  
  switch (goal) {
    case "LOSE_FAT":
      return tdee - 250;
    case "GAIN_MUSCLE":
    case "FITNESS":
    case "ATHLETIC":
      return tdee + 200;
    case "MAINTAIN":
    default:
      return tdee;
  }
}

export async function getUserContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) {
    throw new Error("User not found");
  }
  
  // Calculate calorie budget from user data
  let calorieBudget = 2000; // default
  let proteinTarget = 120; // default
  
  if (user.weightKg && user.heightCm && user.age && user.gender) {
    const bmr = calculateBMR(
      user.weightKg,
      user.heightCm,
      user.age,
      user.gender
    );
    const tdee = calculateTDEE(bmr, user.weeklyActivity || 2);
    calorieBudget = Math.round(adjustByGoal(tdee, user.fitnessGoal));
    
    // Protein target: 1.2 g/kg (configurable)
    const proteinPerKg = parseFloat(process.env.DEFAULT_PROTEIN_PER_KG || "1.2");
    proteinTarget = Math.round(user.weightKg * proteinPerKg);
  }
  
  // Parse JSON strings to arrays for SQLite compatibility
  const { parseJsonArray } = await import("@/lib/sqlite-utils");
  
  return {
    calorieBudget,
    proteinTarget,
    dietPrefs: parseJsonArray<string>(user.dietPrefs),
    avoidFoods: parseJsonArray<string>(user.avoidFoods),
    timeBudgetMin: user.timeBudgetMin || 20,
    weeklyActivity: user.weeklyActivity || 2,
    fitnessGoal: user.fitnessGoal,
    scheduleCons: user.scheduleCons,
    mealRegular: user.mealRegular,
    // Include user data for planner context
    weightKg: user.weightKg,
    heightCm: user.heightCm,
    age: user.age,
    gender: user.gender,
  };
}

export async function searchMenuItems(options: {
  query?: string;
  dietPrefs?: string[];
  proteinMin?: number;
  priceMax?: number;
}) {
  const where: any = {};
  
  if (options.priceMax) {
    where.priceUSD = { lte: options.priceMax };
  }
  
  if (options.proteinMin) {
    where.proteinG = { gte: options.proteinMin };
  }
  
  let items = await prisma.menuItem.findMany({
    where,
    include: { vendor: true },
    take: 20,
  });
  
  // Filter by diet preferences
  // Parse tags from JSON string (SQLite compatibility)
  const { parseJsonArray } = await import("@/lib/sqlite-utils");
  
  if (options.dietPrefs && options.dietPrefs.length > 0) {
    items = items.filter((item) => {
      const itemTags = parseJsonArray<string>(item.tags);
      return options.dietPrefs!.some((pref) =>
        itemTags.some((tag) => tag.toLowerCase().includes(pref.toLowerCase()))
      );
    });
  }
  
  // Rank by semantic similarity if query provided
  if (options.query) {
    try {
      const queryEmbedding = await getQueryEmbedding(options.query);
      const ranked = await Promise.all(
        items.map(async (item) => {
          if (item.embedding) {
            const itemEmbedding = new Float32Array(item.embedding.buffer);
            const similarity = cosineSimilarity(queryEmbedding, itemEmbedding);
            return { item, similarity };
          }
          return { item, similarity: 0 };
        })
      );
      
      ranked.sort((a, b) => b.similarity - a.similarity);
      items = ranked.map((r) => r.item);
    } catch (error) {
      console.error("Error ranking items:", error);
    }
  }
  
  return items.slice(0, 10).map((item) => ({
    id: item.id,
    name: item.name,
    vendor: item.vendor.name,
    calories: item.calories,
    proteinG: item.proteinG,
    carbsG: item.carbsG,
    fatG: item.fatG,
    priceUSD: item.priceUSD,
    tags: parseJsonArray<string>(item.tags),
  }));
}

export async function listRecClasses(options: {
  from: string;
  to: string;
  intensity?: "low" | "med" | "high";
}) {
  const where: any = {
    startTime: {
      gte: new Date(options.from),
      lte: new Date(options.to),
    },
  };
  
  if (options.intensity) {
    where.intensity = options.intensity;
  }
  
  const classes = await prisma.fitnessClass.findMany({
    where,
    orderBy: { startTime: "asc" },
    take: 20,
  });
  
  return classes.map((cls) => ({
    id: cls.id,
    title: cls.title,
    startTime: cls.startTime.toISOString(),
    endTime: cls.endTime.toISOString(),
    location: cls.location,
    intensity: cls.intensity,
    url: cls.url,
  }));
}

export function composeTimeline(items: any[], freeWindows: any[]) {
  // Simple greedy packing algorithm
  // This is a placeholder - would need actual calendar integration
  return items;
}

