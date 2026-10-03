import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ensureArray, safeJsonParse } from "./lib";

// ---- Queries ----

export const listArticles = query({
  args: {
    category: v.optional(v.string()),
    tag: v.optional(v.string()),
    filter: v.optional(v.string()),
    sort: v.optional(v.string()),
    page: v.optional(v.number()),
    perPage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("articles");

    if (args.category) {
      q = q.filter((doc) => doc.category === args.category);
    }
    if (args.tag) {
      q = q.filter((doc) => doc.tags.includes(args.tag));
    }
    if (args.filter) {
      const term = args.filter.toLowerCase();
      q = q.filter((doc) => {
        const text = `${doc.title} ${doc.excerpt} ${doc.category} ${doc.tags.join(" ")}`
          .toLowerCase();
        return text.includes(term);
      });
    }

    const all = await q.order("desc").take(200);
    const total = all.length;
    const start = (args.page ?? 1 - 1) * 20;
    const items = start >= total ? [] : all.slice(start, start + 20);
    return { items, total };
  },
});

export const getArticleBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const article = await ctx.db.query("articles").filter((doc) => doc.slug === args.slug).first();
    if (!article) return null;
    return article as any;
  },
});

export const listRelatedArticles = query({
  args: { articleId: v.id("articles"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) return [];
    const qs = await ctx.db.query("articles");
    const all = await qs.order("desc").collect();
    const matching = all.filter(
      (a) => a._id !== args.articleId && a.tags.some((t) => article.tags.includes(t)),
    );
    return matching.slice(0, args.limit ?? 3);
  },
});

// ---- Mutations ----

export const createArticle = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    cover: v.optional(v.string()),
    category: v.string(),
    tags: v.array(v.string()),
    author: v.string(),
    publishedAt: v.optional(v.number()),
    readingTime: v.optional(v.number()),
    featured: v.optional(v.boolean()),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const now = Date.now();
    const id = await ctx.db.insert("articles", {
      title: args.title,
      slug: args.slug,
      excerpt: args.excerpt,
      content: args.content,
      cover: args.cover,
      category: args.category,
      tags: args.tags,
      author: args.author,
      publishedAt: args.published ? (args.publishedAt ?? now) : undefined,
      createdAt: now,
      readingTime: args.readingTime,
      featured: args.featured ?? false,
      published: args.published ?? false,
    });
    return id;
  },
});

export const updateArticle = mutation({
  args: {
    id: v.id("articles"),
    patch: v.object({
      title: v.optional(v.string()),
      slug: v.optional(v.string()),
      excerpt: v.optional(v.string()),
      content: v.optional(v.string()),
      cover: v.optional(v.string()),
      category: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      author: v.optional(v.string()),
      publishedAt: v.optional(v.number()),
      readingTime: v.optional(v.number()),
      featured: v.optional(v.boolean()),
      published: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Article not found");
    await ctx.db.patch(args.id, {
      ...args.patch,
      publishedAt: args.patch.published ? Date.now() : record.publishedAt,
    });
    return true;
  },
});

export const deleteArticle = mutation({
  args: { id: v.id("articles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    await ctx.db.delete(args.id);
    return true;
  },
});

export const setArticlePublished = mutation({
  args: { id: v.id("articles"), published: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Article not found");
    await ctx.db.patch(args.id, {
      published: args.published,
      publishedAt: args.published ? Date.now() : undefined,
    });
    return true;
  },
});

export const setArticleFeatured = mutation({
  args: { id: v.id("articles"), featured: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Article not found");
    await ctx.db.patch(args.id, { featured: args.featured });
    return true;
  },
});
