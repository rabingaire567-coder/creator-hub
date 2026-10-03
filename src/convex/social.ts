import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ---- Queries ----

export const listSocialLinks = query({
  args: {},
  handler: async (ctx) => {
    const links = await ctx.db.query("socialLinks").order("desc").collect();
    // Re-sort by the stored order field
    return links.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },
});

export const getSocialLinkByPlatform = query({
  args: { platform: v.string() },
  handler: async (ctx, args) => {
    return await ctx
      .db.query("socialLinks")
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .first();
  },
});

// ---- Mutations ----

export const setSocialLink = mutation({
  args: {
    platform: v.string(),
    label: v.string(),
    url: v.string(),
    enabled: v.boolean(),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const existing = await ctx.db
      .query("socialLinks")
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        label: args.label,
        url: args.url,
        enabled: args.enabled,
        order: args.order ?? existing.order,
      });
    } else {
      await ctx.db.insert("socialLinks", {
        platform: args.platform,
        label: args.label,
        url: args.url,
        enabled: args.enabled,
        order: args.order ?? 0,
      });
    }
    return true;
  },
});

export const deleteSocialLink = mutation({
  args: { platform: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const record = await ctx.db
      .query("socialLinks")
      .filter((q) => q.eq(q.field("platform"), args.platform))
      .first();
    if (record) {
      await ctx.db.delete(record._id);
    }
    return true;
  },
});

export const reorderSocialLinks = mutation({
  args: { ids: v.array(v.id("socialLinks")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const validIds = args.ids.filter((id) => {
      const rec = ctx.db.get(id);
      return (rec as { platform?: string } | null)?.platform;
    });
    if (validIds.length === 0) return true;
    const updates = validIds.map((id, index) =>
      ctx.db.patch(id, { order: index }),
    );
    await Promise.all(updates);
    return true;
  },
});
