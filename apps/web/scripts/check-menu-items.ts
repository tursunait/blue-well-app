#!/usr/bin/env tsx

/**
 * Check menu items in database
 */

import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🔍 Checking menu items in database...\n");

  try {
    // Count all items
    const totalItems = await prisma.menuItem.count();
    console.log(`Total menu items: ${totalItems}`);

    // Count items with calories and protein
    const itemsWithNutrition = await prisma.menuItem.count({
      where: {
        calories: { not: null },
        proteinG: { not: null },
      },
    });
    console.log(`Items with calories AND protein: ${itemsWithNutrition}`);

    // Count Duke Dining items
    const dukeItems = await prisma.menuItem.count({
      where: {
        vendor: { source: "DUKE_DINING" },
      },
    });
    console.log(`Duke Dining items: ${dukeItems}`);

    // Count Duke Dining items with nutrition
    const dukeItemsWithNutrition = await prisma.menuItem.count({
      where: {
        vendor: { source: "DUKE_DINING" },
        calories: { not: null },
        proteinG: { not: null },
      },
    });
    console.log(`Duke Dining items with calories AND protein: ${dukeItemsWithNutrition}\n`);

    // Show sample items
    const sampleItems = await prisma.menuItem.findMany({
      where: {
        vendor: { source: "DUKE_DINING" },
      },
      include: { vendor: true },
      take: 5,
    });

    console.log("Sample items:");
    sampleItems.forEach((item) => {
      console.log(`  - ${item.name} (${item.vendor.name})`);
      console.log(`    Calories: ${item.calories ?? "N/A"}, Protein: ${item.proteinG ?? "N/A"}g`);
    });

    // Check vendors
    const vendors = await prisma.menuVendor.findMany({
      where: { source: "DUKE_DINING" },
    });
    console.log(`\nDuke Dining vendors: ${vendors.length}`);
    vendors.forEach((v) => {
      console.log(`  - ${v.name}`);
    });

    if (dukeItemsWithNutrition === 0) {
      console.log("\n⚠️  WARNING: No Duke Dining items have both calories and protein!");
      console.log("   This is why plan generation fails.");
      console.log("   The CSV file may not have nutrition data, or it's in different columns.");
    }

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

main();

