import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create a test user
  const user = await prisma.user.upsert({
      where: { email: "test@bluewell.com" },
    update: {},
    create: {
      email: "test@bluewell.com",
      name: "Test User",
      profile: {
        create: {
          age: 30,
          gender: "Other",
          heightCm: 175,
          weightKg: 70,
          units: "metric",
          primaryGoal: "General fitness",
          weeklyWorkouts: 3,
          dietPrefs: ["Vegetarian"],
          allergies: [],
          budgetWeekly: 100,
          timePrefs: ["morning", "evening"],
        },
      },
      integrations: {
        create: {
          gcalConnected: false,
          myrecConnected: false,
        },
      },
    },
  });

  // Create sample class slots
  const now = new Date();
  for (let i = 0; i < 5; i++) {
    const start = new Date(now);
    start.setDate(start.getDate() + i);
    start.setHours(9 + i * 2, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    await prisma.classSlot.create({
      data: {
        title: `Sample Class ${i + 1}`,
        start,
        end,
        location: "Downtown Studio",
        spotsOpen: 10 + i,
        provider: "myrec",
      },
    });
  }

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

