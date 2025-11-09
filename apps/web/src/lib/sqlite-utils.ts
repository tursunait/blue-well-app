/**
 * Utility functions for SQLite compatibility
 * SQLite doesn't support arrays/JSON natively, so we store them as JSON strings
 */

/**
 * Parse a JSON string to an array, with fallback to empty array
 */
export function parseJsonArray<T = string>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Stringify an array to JSON string
 */
export function stringifyJsonArray<T = string>(value: T[] | null | undefined): string | null {
  if (!value || value.length === 0) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/**
 * Parse a JSON string to an object
 */
export function parseJsonObject<T = any>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Stringify an object to JSON string
 */
export function stringifyJsonObject(value: any): string | null {
  if (!value) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

