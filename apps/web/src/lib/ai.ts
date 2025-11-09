import OpenAI, { APIError } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Fn<T> = () => Promise<T>;

interface RetryOptions {
  retries?: number;
  baseMs?: number;
}

/**
 * Retry wrapper for OpenAI API calls with exponential backoff
 * Handles 429 (rate limit) and 5xx errors
 */
export async function withRetry<T>(
  fn: Fn<T>,
  opts: RetryOptions = { retries: 3, baseMs: 400 }
): Promise<T> {
  const { retries = 3, baseMs = 400 } = opts;
  let err: unknown;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      err = e;
      const is429 = e?.status === 429 || e?.code === "insufficient_quota" || e?.code === "rate_limit_exceeded";
      const is5xx = e?.status && e.status >= 500 && e.status < 600;

      // Only retry on 429 or 5xx errors
      if (!(is429 || is5xx)) {
        break;
      }

      // Don't retry on the last attempt
      if (i === retries - 1) {
        break;
      }

      // Exponential backoff with jitter
      const sleep = baseMs * Math.pow(2, i) + Math.random() * 200;
      await new Promise((r) => setTimeout(r, sleep));
    }
  }

  throw err;
}

export { openai };

