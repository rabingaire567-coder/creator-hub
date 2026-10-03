import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Auth } from "convex/server";
import type { GenericDatabaseReader } from "convex/server";

/**
 * Minimal ctx shape accepted by requireAdmin. The generated mutation ctx is
 * structurally assignable to this.
 */
type AdminCtx = {
  auth: Auth;
  db: GenericDatabaseReader<any>;
};

/**
 * Owner-only guard for admin mutations.
 *
 * - Signed-out visitors are always rejected.
 * - If `siteSettings.adminEmail` is unset (fresh install), any signed-in
 *   account may write — this is the one-time bootstrap window.
 * - Once the owner sets their email in Admin → Website Settings, only that
 *   account (matching email) may write.
 */
export async function requireAdmin(ctx: AdminCtx): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Unauthorized");
  const settings = await ctx.db.query("siteSettings").first();
  const adminEmail = settings?.adminEmail?.trim().toLowerCase();
  if (!adminEmail) return userId; // bootstrap window
  const user = await ctx.db.get(userId);
  const email = (user as { email?: string } | null)?.email?.trim().toLowerCase();
  if (email && email === adminEmail) return userId;
  throw new Error("Unauthorized");
}

/**
 * Safe db.get for ids that arrive as raw strings (e.g. from URL params).
 * Malformed ids throw inside db.get — this returns null instead so public
 * pages can render their not-found state instead of crashing.
 */
export async function safeGet<T = any>(
  db: GenericDatabaseReader<any>,
  id: string,
): Promise<T | null> {
  if (!id) return null;
  try {
    return (((await db.get(id as any)) as T) ?? null);
  } catch {
    return null;
  }
}

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
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    if (!value.trim()) return fallback;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [parsed as T];
    } catch {
      return [value as unknown as T];
    }
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
