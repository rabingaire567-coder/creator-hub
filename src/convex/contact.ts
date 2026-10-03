import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ---- Queries ----

export const listContactMessages = query({
  args: {
    category: v.optional(v.string()),
    status: v.optional(v.string()),
    page: v.optional(v.number()),
    perPage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("contactMessages").order("desc");
    if (args.category) {
      q = q.filter((doc) => doc.category === args.category);
    }
    if (args.status) {
      q = q.filter((doc) => doc.status === args.status);
    }
    const all = await q.order("desc").take(300);
    const total = all.length;
    const start = (args.page - 1) * 20;
    const items = start >= total ? [] : all.slice(start, start + 20);
    return { items, total };
  },
});

export const getContactMessageById = query({
  args: { id: v.id("contactMessages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const countContactMessages = query({
  args: {},
  handler: async (ctx) => {
    const count = await ctx.db.query("contactMessages").count();
    return count;
  },
});

// ---- Mutations ----

export const createContactMessage = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    category: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("contactMessages", {
      name: args.name,
      email: args.email,
      subject: args.subject,
      category: args.category,
      message: args.message,
      status: "new",
      createdAt: now,
    });
    return id;
  },
});

export const updateContactMessage = mutation({
  args: { id: v.id("contactMessages"), status: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Message not found");
    await ctx.db.patch(args.id, { status: args.status });
    return true;
  },
});
