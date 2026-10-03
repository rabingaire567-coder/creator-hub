import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAdmin } from "./lib";

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
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);
    const validIds: (typeof args.ids)[number][] = [];
    for (const id of args.ids) {
      const rec = await ctx.db.get(id);
      if (rec) validIds.push(id);
    }
    if (validIds.length === 0) return true;
    for (let index = 0; index < validIds.length; index++) {
      await ctx.db.patch(validIds[index], { order: index });
    }
    return true;
  },
});
