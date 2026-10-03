import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { isAdmin, requireAdmin } from "./lib";

// ---- helpers ----

const PAGE_SIZE = 20;
const MAX_DOCS = 500;

function paginate<T>(items: T[], page: number | undefined) {
  const total = items.length;
  const start = ((page ?? 1) - 1) * PAGE_SIZE;
  const paged = start >= total ? [] : items.slice(start, start + PAGE_SIZE);
  return { items: paged, total };
}

function textOf(article: {
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
}): string {
  return `${article.title} ${article.excerpt} ${article.category} ${article.tags.join(" ")}`.toLowerCase();
}

// ---- Queries ----

export const listArticles = query({
  args: {
    category: v.optional(v.string()),
    tag: v.optional(v.string()),
    filter: v.optional(v.string()),
    sort: v.optional(v.string()),
    featuredOnly: v.optional(v.boolean()),
    // Admin: include drafts as well as published items
    includeDrafts: v.optional(v.boolean()),
    page: v.optional(v.number()),
    perPage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("articles").take(MAX_DOCS);

    // Drafts never leave the server unless the caller is the site owner, and
    // "featured only" narrows the published set instead of replacing it.
    const includeDrafts = args.includeDrafts === true && (await isAdmin(ctx));
    let items = all;
    if (!includeDrafts) {
      items = items.filter((article) => article.published === true);
    }
    if (args.featuredOnly) {
      items = items.filter((article) => article.featured === true);
    }

    if (args.category) {
      items = items.filter((article) => article.category === args.category);
    }
    if (args.tag) {
      items = items.filter((article) => article.tags.includes(args.tag!));
    }
    if (args.filter) {
      const term = args.filter.toLowerCase();
      items = items.filter((article) => textOf(article).includes(term));
    }

    items.sort(
      (a, b) =>
        (b.publishedAt ?? b.createdAt ?? 0) - (a.publishedAt ?? a.createdAt ?? 0),
    );

    return paginate(items, args.page);
  },
});

export const getArticleBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("articles").take(MAX_DOCS);
    return (
      all.find(
        (article) => article.published === true && article.slug === args.slug,
      ) ?? null
    );
  },
});

export const listRelatedArticles = query({
  args: { articleId: v.id("articles"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) return [];
    const all = await ctx.db.query("articles").take(MAX_DOCS);
    const matching = all.filter(
      (a) =>
        a._id !== args.articleId &&
        a.published === true &&
        a.tags.some((tag) => article.tags.includes(tag)),
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
    await requireAdmin(ctx);
    const duplicate = await ctx.db
      .query("articles")
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .first();
    if (duplicate) throw new Error("An article with this slug already exists.");
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
    await requireAdmin(ctx);
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Article not found");
    const nextSlug = args.patch.slug;
    if (nextSlug && nextSlug !== record.slug) {
      const duplicate = await ctx.db
        .query("articles")
        .filter((q) => q.eq(q.field("slug"), nextSlug))
        .first();
      if (duplicate)
        throw new Error("An article with this slug already exists.");
    }
    const patch: Partial<typeof record> = { ...args.patch };
    if (args.patch.published !== undefined) {
      patch.publishedAt = args.patch.published
        ? (args.patch.publishedAt ?? Date.now())
        : undefined;
    }
    await ctx.db.patch(args.id, patch);
    return true;
  },
});

export const deleteArticle = mutation({
  args: { id: v.id("articles") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    return true;
  },
});

export const setArticlePublished = mutation({
  args: { id: v.id("articles"), published: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Article not found");
    await ctx.db.patch(args.id, { featured: args.featured });
    return true;
  },
});
