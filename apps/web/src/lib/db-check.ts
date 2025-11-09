/**
 * Database connection check utility
 * Helps diagnose DATABASE_URL and Prisma client issues
 */

import { prisma } from "./prisma";

export async function checkDatabaseConnection() {
  try {
    // Try a simple query to verify connection
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true, error: null };
  } catch (error: any) {
    return {
      connected: false,
      error: error?.message || String(error),
      hint: "Check DATABASE_URL in .env.local",
    };
  }
}

export function getAvailablePrismaModels() {
  if (!prisma) {
    return [];
  }
  return Object.keys(prisma).filter(
    (k) => !k.startsWith("$") && !k.startsWith("_") && typeof (prisma as any)[k] === "object"
  );
}

