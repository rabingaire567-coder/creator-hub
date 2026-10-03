import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAdmin } from "./lib";

// ---- Queries ----

export const listTags = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tags").order("desc").collect();
  },
});

export const getTagById = query({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getTagBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.query("tags").filter((q) => q.eq(q.field("slug"), args.slug)).first();
  },
});

// ---- Mutations ----

export const createTag = mutation({
  args: { name: v.string(), slug: v.string(), color: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("tags")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
    if (existing) return existing._id;
    const id = await ctx.db.insert("tags", {
      name: args.name,
      slug: args.slug,
      color: args.color ?? "#6E8BAC",
      createdAt: Date.now(),
    });
    return id;
  },
});

export const renameTag = mutation({
  args: { id: v.id("tags"), name: v.string(), slug: v.string(), color: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Tag not found");
    await ctx.db.patch(args.id, {
      name: args.name,
      slug: args.slug,
      color: args.color ?? record.color,
    });
    return true;
  },
});

export const deleteTag = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    return true;
  },
});

export const setTagEnabled = mutation({
  args: { id: v.id("tags"), enabled: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Tag not found");
    await ctx.db.patch(args.id, { enabled: args.enabled });
    return true;
  },
});
