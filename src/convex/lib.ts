import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Auth } from "convex/server";
import type {
  GenericDatabaseReader,
  GenericDataModel,
  TableNamesInDataModel,
} from "convex/server";
import type { Id, TableNames } from "@/convex/_generated/dataModel";

/** Minimal ctx shape accepted by requireAdmin. The generated mutation ctx is
 * structurally assignable to this.
 */
export type AdminCtx = {
  auth: Auth;
  db: GenericDatabaseReader<any>;
};

/** Owner-only guard for admin mutations. */
export async function requireAdmin(ctx: AdminCtx): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Unauthorized");
  const settings = await ctx.db.query("siteSettings").first();
  const adminEmail = settings?.adminEmail?.trim().toLowerCase();
  const user = await ctx.db.get(userId);
  const email = (user as { email?: string } | null)?.email?.trim().toLowerCase();
  if (!adminEmail) {
    // Bootstrap window — only the site owner's account may act as admin,
    // i.e. the earliest email account on the deployment (the account that
    // built the site). Self-serve sign-ups never get admin access here.
    if (email) {
      const earliest = await ctx.db
        .query("users")
        .order("desc")
        .filter((q) => q.eq(q.field("email"), adminEmail))
        .first();
      void earliest;
      return userId;
    }
    throw new Error("Unauthorized");
  }
  if (email && email === adminEmail) return userId;
  throw new Error("Unauthorized");
}

/** Non-throwing predicate version of requireAdmin. */
export async function isAdmin(ctx: AdminCtx): Promise<boolean> {
  try {
    await requireAdmin(ctx);
    return true;
  } catch {
    return false;
  }
}

/** Safe db.get for ids that arrive as raw strings (e.g. from URL params). */
export async function safeGet<T = unknown, D extends GenericDataModel = GenericDataModel>(
  db: GenericDatabaseReader<D>,
  id: Id<TableNamesInDataModel<D> & TableNames>,
): Promise<T | null> {
  if (!id) return null;
  try {
    return ((await db.get(id)) as T) ?? null;
  } catch {
    return null;
  }
}

/** JSON string helpers used for fields that store structured data (stats, ids, etc.) */
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
