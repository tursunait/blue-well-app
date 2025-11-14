#!/usr/bin/env tsx

/**
 * Reset survey/onboarding data for a user
 * Usage: npx tsx scripts/reset-survey.ts [email]
 */

import { prisma } from "../src/lib/prisma";

async function main() {
  const email = process.argv[2] || "test@halo.com";
  
  console.log(`🔄 Resetting survey data for: ${email}\n`);

  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.name || user.email} (${user.id})\n`);

    // Delete survey answers
    const deletedAnswers = await prisma.surveyAnswer.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✅ Deleted ${deletedAnswers.count} survey answers`);

    // Reset user profile data
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        age: null,
        gender: null,
        heightCm: null,
        weightKg: null,
        fitnessGoal: null,
        reminderPref: null,
        scheduleCons: null,
        mealRegular: null,
        weeklyActivity: null,
        timeBudgetMin: null,
        dietPrefs: null,
        avoidFoods: null,
      },
    });
    console.log(`✅ Reset user profile data`);

    // Delete Profile if exists
    const deletedProfile = await prisma.profile.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✅ Deleted ${deletedProfile.count} profile records`);

    // Optionally delete recommendations/plans
    const deletedRecs = await prisma.aIRec.deleteMany({
      where: { userId: user.id },
    });
    console.log(`✅ Deleted ${deletedRecs.count} AI recommendations`);

    console.log(`\n✅ Survey reset complete!`);
    console.log(`   User can now go through onboarding again at /onboarding`);
    
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Error resetting survey:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

