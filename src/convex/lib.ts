import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Auth } from "convex/server";
import type {
  GenericDatabaseReader,
  GenericDataModel,
  TableNamesInDataModel,
} from "convex/server";
import type { Id, TableNames } from "./_generated/dataModel";

/** Minimal ctx shape accepted by requireAdmin. The generated mutation ctx is
 * structurally assignable to this — D is inferred from the caller's ctx.db.
 */
export type AdminCtx<D extends GenericDataModel = GenericDataModel> = {
  auth: Auth;
  db: GenericDatabaseReader<D>;
};

/** Owner-only guard for admin mutations. */
export async function requireAdmin<D extends GenericDataModel>(
  ctx: AdminCtx<D>,
): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Unauthorized");
  const settings = await ctx.db.query("siteSettings").first();
  const rawAdminEmail = settings?.adminEmail;
  const adminEmail =
    typeof rawAdminEmail === "string"
      ? rawAdminEmail.trim().toLowerCase()
      : undefined;
  const user = await ctx.db.get(userId);
  const rawEmail = user?.email;
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : undefined;
  if (!adminEmail) {
    // Bootstrap window — until siteSettings.adminEmail is set, only the
    // site owner may act as admin: the earliest email account on this
    // deployment (the account that built the site). Anonymous accounts and
    // self-serve sign-ups never qualify here.
    if (email) {
      const earliest = await ctx.db
        .query("users")
        .filter((q) => q.neq(q.field("email"), undefined))
        .order("asc")
        .first();
      const rawEarliestEmail = earliest?.email;
      const earliestEmail =
        typeof rawEarliestEmail === "string"
          ? rawEarliestEmail.trim().toLowerCase()
          : undefined;
      if (earliestEmail && earliestEmail === email) return userId;
    }
    throw new Error("Unauthorized");
  }
  if (email && email === adminEmail) return userId;
  throw new Error("Unauthorized");
}

/** Non-throwing predicate version of requireAdmin. */
export async function isAdmin<D extends GenericDataModel>(
  ctx: AdminCtx<D>,
): Promise<boolean> {
  try {
    await requireAdmin(ctx);
    return true;
  } catch {
    return false;
  }
}

/** Safe db.get for ids that arrive as raw strings (e.g. from URL params).
 * D is the caller's data model — pass it explicitly alongside T so the
 * reader type matches: safeGet<Doc<"posts">, DataModel>(ctx.db, id).
 */
export async function safeGet<
  T = unknown,
  D extends GenericDataModel = GenericDataModel,
>(db: GenericDatabaseReader<D>, id: string): Promise<T | null> {
  if (!id) return null;
  try {
    return (
      (await db.get(id as Id<TableNamesInDataModel<D> & TableNames>)) as T
    ) ?? null;
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
