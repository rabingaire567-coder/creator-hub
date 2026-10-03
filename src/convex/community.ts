import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ---- Queries ----

export const listCommunitySubmissions = query({
  args: {
    status: v.optional(v.string()),
    page: v.optional(v.number()),
    perPage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("communitySubmissions").order("desc");
    if (args.status) {
      q = q.filter((doc) => doc.status === args.status);
    }
    const all = await q.order("desc").take(300);
    const total = all.length;
    const start = (args.page ?? 1 - 1) * 20;
    const items = start >= total ? [] : all.slice(start, start + 20);
    return { items, total };
  },
});

export const getSubmissionById = query({
  args: { id: v.id("communitySubmissions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ---- Mutations ----

export const createSubmission = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    suggestion: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("communitySubmissions", {
      name: args.name,
      email: args.email,
      suggestion: args.suggestion,
      category: args.category,
      status: "new",
      createdAt: now,
    });
    return id;
  },
});

export const updateSubmission = mutation({
  args: { id: v.id("communitySubmissions"), status: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Submission not found");
    await ctx.db.patch(args.id, { status: args.status });
    return true;
  },
});
