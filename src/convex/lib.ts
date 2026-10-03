import { v } from "convex/values";

// JSON string helpers used for fields that store structured data (stats, ids, etc.)
export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function ensureArray<T>(value: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return fallback;
    }
  }
  if (typeof value === "string" && value.trim()) {
    return [value];
  }
  return fallback;
}

export function ensureObject<T>(value: unknown, fallback: T): T {
  if (value && typeof value === "object") {
    return value as T;
  }
  return fallback;
}

export const slugValidator = v.object({
  slug: v.string(),
});

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
