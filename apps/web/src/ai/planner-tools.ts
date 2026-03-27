import { prisma } from "@/lib/prisma";
import { getQueryEmbedding, cosineSimilarity } from "./embeddings";
import { calculateDailyTargets } from "@/lib/targets";

export async function getUserContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) {
    throw new Error("User not found");
  }
  
  const targets = calculateDailyTargets(user);
  
  // Parse JSON strings to arrays for SQLite compatibility
  const { parseJsonArray } = await import("@/lib/sqlite-utils");
  
  return {
    calorieBudget: targets.kcal,
    proteinTarget: targets.protein_g,
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
  mealType?: "Breakfast" | "Lunch" | "Dinner";
}) {
  // Use database as primary source (MenuItem and MenuVendor tables)
  console.log(`[searchMenuItems] Searching database for menu items with options:`, options);
  
  const where: any = {};
  
  // Filter by vendor source - prioritize Duke Dining items
  const vendors = await prisma.menuVendor.findMany({
    where: { source: "DUKE_DINING" },
  });
  
  if (vendors.length > 0) {
    where.vendorId = { in: vendors.map(v => v.id) };
  }
  
  if (options.priceMax) {
    where.priceUSD = { lte: options.priceMax };
  }
  
  if (options.proteinMin) {
    where.proteinG = { gte: options.proteinMin };
  }
  
  let items = await prisma.menuItem.findMany({
    where,
    include: { vendor: true },
    take: 50, // Get more items for filtering
  });
  
  console.log(`[searchMenuItems] Found ${items.length} items from database`);
  
  // Filter by diet preferences
  // Parse tags from JSON string (SQLite compatibility)
  const { parseJsonArray } = await import("@/lib/sqlite-utils");
  
  if (options.dietPrefs && options.dietPrefs.length > 0) {
    const beforeFilter = items.length;
    items = items.filter((item) => {
      const itemTags = parseJsonArray<string>(item.tags);
      return options.dietPrefs!.some((pref) =>
        itemTags.some((tag) => tag.toLowerCase().includes(pref.toLowerCase()))
      );
    });
    console.log(`[searchMenuItems] After diet filter: ${beforeFilter} → ${items.length}`);
  }
  
  // Filter by meal type if specified (check item name/description for meal type keywords)
  if (options.mealType) {
    const mealTypeKeywords: Record<string, string[]> = {
      Breakfast: ["breakfast", "morning", "egg", "pancake", "waffle", "cereal", "oatmeal", "bagel", "croissant"],
      Lunch: ["lunch", "sandwich", "wrap", "salad", "burger", "soup"],
      Dinner: ["dinner", "entrée", "entree", "pasta", "chicken", "beef", "fish", "steak", "curry"],
    };
    
    const keywords = mealTypeKeywords[options.mealType] || [];
    const beforeFilter = items.length;
    items = items.filter((item) => {
      const nameLower = item.name.toLowerCase();
      const descLower = (item.description || "").toLowerCase();
      return keywords.some((keyword) => nameLower.includes(keyword) || descLower.includes(keyword));
    });
    console.log(`[searchMenuItems] After meal type filter (${options.mealType}): ${beforeFilter} → ${items.length}`);
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
  
  const results = items.slice(0, 20).map((item) => ({
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
  
  console.log(`[searchMenuItems] Returning ${results.length} items from database`);
  return results;
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

