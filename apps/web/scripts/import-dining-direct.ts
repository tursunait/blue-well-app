#!/usr/bin/env tsx

/**
 * Direct import script for Duke Dining data
 * Bypasses the API and imports directly to the database
 */

import { importDukeDiningExcel } from "../src/etl/dukeDiningExcel";

async function main() {
  console.log("🍽️  Importing Duke Dining data directly...\n");

  try {
    const result = await importDukeDiningExcel();
    
    console.log("\n✅ Import successful!");
    console.log(`   Vendors: ${result.vendorsUpserted}`);
    console.log(`   Items inserted: ${result.itemsInserted}`);
    console.log(`   Items updated: ${result.itemsUpdated}`);
    console.log(`   Items embedded: ${result.embedded}`);
    console.log(`   Items skipped: ${result.skipped}`);
    
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Import failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

