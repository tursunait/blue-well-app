/**
 * Development mode authentication bypass
 * Set SKIP_AUTH=true in .env.local to enable
 */

import { prisma } from "./prisma";

const SKIP_AUTH = process.env.SKIP_AUTH === "true";

export interface MockSession {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  };
}

let mockUserId: string | null = null;

/**
 * Get or create a test user for development
 */
export async function getDevUser(): Promise<string> {
  if (mockUserId) return mockUserId;

  try {
    // Try to find the test user from seed
    let user = await prisma.user.findUnique({
      where: { email: "test@bluewell.com" },
    });

    if (!user) {
      // Create test user if it doesn't exist
      user = await prisma.user.create({
        data: {
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
    }

    mockUserId = user.id;
    return user.id;
  } catch (error) {
    console.error("Error getting dev user:", error);
    // Fallback to a hardcoded ID if DB fails
    return "dev-user-id";
  }
}

/**
 * Get a mock session for development mode
 */
export async function getMockSession(): Promise<MockSession | null> {
  if (!SKIP_AUTH) return null;

  const userId = await getDevUser();
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return null;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
  };
}

/**
 * Check if dev mode is enabled
 */
export function isDevMode(): boolean {
  return SKIP_AUTH;
}

/**
 * Get user ID for API routes (works in both dev and prod mode)
 */
export async function getUserId(session: any): Promise<string | null> {
  if (SKIP_AUTH) {
    return await getDevUser();
  }
  return session?.user?.id || null;
}

