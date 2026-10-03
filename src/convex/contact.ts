import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAdmin } from "./lib";

// ---- helpers ----

const PAGE_SIZE = 20;
const MAX_DOCS = 500;

function paginate<T>(items: T[], page: number | undefined) {
  const total = items.length;
  const start = ((page ?? 1) - 1) * PAGE_SIZE;
  const paged = start >= total ? [] : items.slice(start, start + PAGE_SIZE);
  return { items: paged, total };
}

// ---- Queries ----

export const listContactMessages = query({
  args: {
    category: v.optional(v.string()),
    status: v.optional(v.string()),
    page: v.optional(v.number()),
    perPage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("contactMessages").take(MAX_DOCS);
    let items = all;
    if (args.category) {
      items = items.filter((doc) => doc.category === args.category);
    }
    if (args.status) {
      items = items.filter((doc) => doc.status === args.status);
    }
    items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return paginate(items, args.page);
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
    const all = await ctx.db.query("contactMessages").take(1000);
    return all.length;
  },
});

export const countNewContactMessages = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("contactMessages").take(1000);
    return all.filter((doc) => doc.status === "new").length;
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
    await requireAdmin(ctx);
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Message not found");
    await ctx.db.patch(args.id, { status: args.status });
    return true;
  },
});
