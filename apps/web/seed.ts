import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create a test user (using direct User fields, not Profile relation)
  const user = await prisma.user.upsert({
    where: { email: "test@halo.com" },
    update: {},
    create: {
      email: "test@halo.com",
      name: "Test User",
          age: 30,
          gender: "Other",
          heightCm: 175,
          weightKg: 70,
      fitnessGoal: "FITNESS",
      weeklyActivity: 3,
      dietPrefs: JSON.stringify(["Vegetarian"]),
      avoidFoods: null,
      googleCalConnected: false,
      myRecConnected: false,
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

