/**
 * Environment variable validation and helpers
 * Logs warnings in dev but doesn't crash
 */

export function checkEnvVars() {
  if (process.env.NODE_ENV === "development") {
    if (!process.env.OPENAI_API_KEY) {
      console.warn(
        "[env] OPENAI_API_KEY is not set. AI features will be disabled or use fallbacks."
      );
    }

    if (!process.env.DATABASE_URL) {
      console.warn("[env] DATABASE_URL is not set. Database operations will fail.");
    }
  }
}

// Run check on module load (only in dev)
if (process.env.NODE_ENV === "development") {
  checkEnvVars();
}

