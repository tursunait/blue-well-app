/**
 * Diagnostic script to check database configuration
 * Run with: npx tsx scripts/check-db.ts
 */

import { prisma } from "../src/lib/prisma";

async function checkDatabase() {
  console.log("🔍 Checking database configuration...\n");

  // Check DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL is not set in environment");
    return;
  }
  console.log("✅ DATABASE_URL is set:", dbUrl.replace(/:[^:@]+@/, ":****@"));

  // Check Prisma client
  if (!prisma) {
    console.error("❌ Prisma client is not initialized");
    return;
  }
  console.log("✅ Prisma client initialized");

  // Check available models
  const models = Object.keys(prisma).filter(
    (k) => !k.startsWith("$") && !k.startsWith("_") && typeof (prisma as any)[k] === "object"
  );
  console.log(`✅ Found ${models.length} Prisma models:`, models.join(", "));

  // Check specific models we need
  const requiredModels = ["user", "aIRec"];
  for (const modelName of requiredModels) {
    const model = (prisma as any)[modelName];
    if (model && typeof model.findFirst === "function") {
      console.log(`✅ Model '${modelName}' is available`);
    } else {
      console.error(`❌ Model '${modelName}' is NOT available`);
    }
  }

  // Test database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection successful");
  } catch (error: any) {
    console.error("❌ Database connection failed:", error.message);
  }

  // Test a simple query
  try {
    const userCount = await prisma.user.count();
    console.log(`✅ Can query database (found ${userCount} users)`);
  } catch (error: any) {
    console.error("❌ Cannot query database:", error.message);
  }
}

checkDatabase()
  .then(() => {
    console.log("\n✅ Diagnostic complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Diagnostic failed:", error);
    process.exit(1);
  });

