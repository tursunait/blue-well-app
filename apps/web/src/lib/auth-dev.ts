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
      where: { email: "test@halo.com" },
    });

    if (!user) {
      // Create test user if it doesn't exist (without legacy profile/integration relations)
      user = await prisma.user.create({
        data: {
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
        },
      });
      console.log("Created test user:", user.id);
    } else {
      console.log("Found existing test user:", user.id);
    }

    mockUserId = user.id;
    return user.id;
  } catch (error) {
    console.error("Error getting dev user:", error);
    // Try to find any user as fallback
    try {
      const anyUser = await prisma.user.findFirst();
      if (anyUser) {
        console.log("Using fallback user:", anyUser.id);
        mockUserId = anyUser.id;
        return anyUser.id;
      }
    } catch (fallbackError) {
      console.error("Fallback user lookup failed:", fallbackError);
    }
    // Last resort: return a hardcoded ID (will fail if user doesn't exist, but better than nothing)
    throw new Error("Could not get or create dev user. Check database connection.");
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

