#!/usr/bin/env tsx

/**
 * Test the exact query used in plan generation
 */

import { prisma } from "../src/lib/prisma";
import { parseJsonArray } from "../src/lib/sqlite-utils";

async function main() {
  console.log("🧪 Testing plan generation query...\n");

  try {
    // This is the exact query from loadDiningItems
    const baseItems = await prisma.menuItem.findMany({
      where: {
        vendor: { source: "DUKE_DINING" },
        calories: { not: null },
        proteinG: { not: null },
      },
      include: { vendor: true },
      take: 60,
    });

    console.log(`✅ Found ${baseItems.length} base items\n`);

    if (baseItems.length === 0) {
      console.log("❌ No items found! This is why plan generation fails.");
      console.log("\nChecking why...");
      
      // Check items without filters
      const allItems = await prisma.menuItem.findMany({
        where: { vendor: { source: "DUKE_DINING" } },
        take: 5,
      });
      console.log(`\nAll Duke Dining items (no filters): ${allItems.length}`);
      allItems.forEach((item) => {
        console.log(`  - ${item.name}: calories=${item.calories}, proteinG=${item.proteinG}`);
      });
    } else {
      console.log("Sample items that would be used:");
      baseItems.slice(0, 5).forEach((item) => {
        console.log(`  - ${item.name} (${item.vendor.name})`);
        console.log(`    Calories: ${item.calories}, Protein: ${item.proteinG}g`);
      });

      // Test with empty diet prefs (like a new user)
      const dietPrefs: string[] = [];
      const avoidFoods: string[] = [];

      const filteredByDiet = dietPrefs.length
        ? baseItems.filter((item) => {
            const tags = parseJsonArray<string>(item.tags).map((tag) => tag.toLowerCase());
            return dietPrefs.every((pref) => tags.includes(pref.toLowerCase()));
          })
        : baseItems;

      console.log(`\nAfter diet filter (empty prefs): ${filteredByDiet.length} items`);

      const finalItems = filteredByDiet.filter((item) => {
        const avoidLower = avoidFoods.map((food) => food.toLowerCase());
        const nameLower = item.name.toLowerCase();
        const descLower = (item.description || "").toLowerCase();
        return !avoidLower.some((avoid) => nameLower.includes(avoid) || descLower.includes(avoid));
      });

      console.log(`After avoid foods filter: ${finalItems.length} items`);
      console.log(`\n✅ Query would return ${Math.min(finalItems.length, 20)} items for plan generation`);
    }

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

