import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { isAdmin, requireAdmin, safeGet } from "./lib";
import type { Doc } from "./_generated/dataModel";

// ---- helpers ----

const PAGE_SIZE = 20;
const MAX_DOCS = 500;

function paginate<T>(items: T[], page: number | undefined) {
  const total = items.length;
  const start = ((page ?? 1) - 1) * PAGE_SIZE;
  const paged = start >= total ? [] : items.slice(start, start + PAGE_SIZE);
  return { items: paged, total };
}

function textOf(post: {
  title: string;
  excerpt: string;
  description: string;
  categories: string[];
}): string {
  return `${post.title} ${post.excerpt} ${post.description} ${post.categories.join(" ")}`.toLowerCase();
}

// ---- Queries ----

export const listPosts = query({
  args: {
    filter: v.optional(v.string()),
    category: v.optional(v.string()),
    tag: v.optional(v.string()),
    featuredOnly: v.optional(v.boolean()),
    // Admin: include drafts as well as published items
    includeDrafts: v.optional(v.boolean()),
    sort: v.optional(v.string()),
    page: v.optional(v.number()),
    perPage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("posts").take(MAX_DOCS);

    // Drafts never leave the server unless the caller is the site owner, and
    // "featured only" narrows the published set instead of replacing it.
    const includeDrafts = args.includeDrafts === true && (await isAdmin(ctx));
    let items = all;
    if (!includeDrafts) {
      items = items.filter((post) => post.published === true);
    }
    if (args.featuredOnly) {
      items = items.filter((post) => post.featured === true);
    }

    if (args.category) {
      items = items.filter((post) => post.categories.includes(args.category!));
    }
    if (args.tag) {
      items = items.filter((post) => post.tags.includes(args.tag!));
    }
    if (args.filter) {
      const term = args.filter.toLowerCase();
      items = items.filter((post) => textOf(post).includes(term));
    }

    items.sort((a, b) => {
      if (args.sort === "views") return (b.views ?? 0) - (a.views ?? 0);
      if (args.sort === "title") return a.title.localeCompare(b.title);
      return (b.createdAt ?? 0) - (a.createdAt ?? 0);
    });

    return paginate(items, args.page);
  },
});

export const listFeaturedPosts = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("posts").take(MAX_DOCS);
    return all
      .filter((post) => post.published === true && post.featured === true)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 6);
  },
});

export const listLatestPosts = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("posts").take(MAX_DOCS);
    return all
      .filter((post) => post.published === true)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 6);
  },
});

/**
 * The homepage "Latest videos" grid: newest published videos first,
 * ordered by publish date (falling back to creation date) so a post
 * surfaces the moment it is published from the dashboard.
 */
export const listLatestVideos = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("posts").take(MAX_DOCS);
    return all
      .filter((post) => post.published === true)
      .sort(
        (a, b) =>
          (b.publishedAt ?? b.createdAt ?? 0) -
          (a.publishedAt ?? a.createdAt ?? 0),
      )
      .slice(0, 6);
  },
});

export const getPostById = query({
  // Raw string on purpose: URL params can contain malformed ids — safeGet
  // returns null so the page can show its not-found state instead of throwing.
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const post = await safeGet<Doc<"posts">>(ctx.db, args.id);
    if (!post) return null;
    if (post.published !== true && !post.publishedAt) return null;
    return post;
  },
});

export const getPostByYoutubeId = query({
  args: { youtubeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .filter((q) => q.eq(q.field("youtubeId"), args.youtubeId))
      .filter((q) => q.eq(q.field("published"), true))
      .first();
  },
});

export const getPostBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("posts").take(MAX_DOCS);
    return (
      all.find(
        (post) =>
          post.published === true &&
          post.title.toLowerCase() === args.slug.toLowerCase(),
      ) ?? null
    );
  },
});

// ---- Mutations ----

export const createPost = mutation({
  args: {
    title: v.string(),
    excerpt: v.string(),
    description: v.string(),
    youtubeUrl: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
    duration: v.optional(v.string()),
    categories: v.array(v.string()),
    tags: v.array(v.string()),
    featured: v.optional(v.boolean()),
    published: v.optional(v.boolean()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const youtubeId = args.youtubeUrl ? extractYouTubeId(args.youtubeUrl) : undefined;
    const now = Date.now();
    const id = await ctx.db.insert("posts", {
      title: args.title,
      excerpt: args.excerpt,
      description: args.description,
      youtubeId,
      youtubeUrl: args.youtubeUrl,
      thumbnail: args.thumbnail,
      duration: args.duration,
      categories: args.categories,
      tags: args.tags,
      featured: args.featured ?? false,
      published: args.published ?? false,
      status: args.status ?? (args.published ? "published" : "draft"),
      publishedAt: args.published ? now : undefined,
      createdAt: now,
      updatedAt: now,
      views: 0,
    });
    return id;
  },
});

export const updatePost = mutation({
  args: {
    id: v.id("posts"),
    patch: v.object({
      title: v.optional(v.string()),
      excerpt: v.optional(v.string()),
      description: v.optional(v.string()),
      youtubeUrl: v.optional(v.string()),
      thumbnail: v.optional(v.string()),
      duration: v.optional(v.string()),
      categories: v.optional(v.array(v.string())),
      tags: v.optional(v.array(v.string())),
      featured: v.optional(v.boolean()),
      published: v.optional(v.boolean()),
      status: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Post not found");
    const youtubeId =
      args.patch.youtubeUrl !== undefined && args.patch.youtubeUrl !== null
        ? extractYouTubeId(args.patch.youtubeUrl)
        : undefined;
    const patch: Partial<typeof record> = { ...args.patch };
    if (args.patch.youtubeUrl !== undefined) {
      patch.youtubeId = youtubeId;
    }
    patch.updatedAt = Date.now();
    if (args.patch.published !== undefined) {
      patch.publishedAt = args.patch.published ? Date.now() : undefined;
      patch.status = args.patch.published ? "published" : "draft";
    }
    await ctx.db.patch(args.id, patch);
    return true;
  },
});

export const deletePost = mutation({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    return true;
  },
});

export const setPostPublished = mutation({
  args: { id: v.id("posts"), published: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Post not found");
    await ctx.db.patch(args.id, {
      published: args.published,
      publishedAt: args.published ? Date.now() : undefined,
      status: args.published ? "published" : "draft",
    });
    return true;
  },
});

export const setPostFeatured = mutation({
  args: { id: v.id("posts"), featured: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Post not found");
    await ctx.db.patch(args.id, { featured: args.featured });
    return true;
  },
});

function extractYouTubeId(url: string): string | undefined {
  if (!url) return undefined;
  const cleaned = url.trim();
  let match = cleaned.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  );
  if (match) return match[1];
  match = cleaned.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  if (cleaned.startsWith("https://youtu.be/")) return cleaned.slice("https://youtu.be/".length);
  if (cleaned.startsWith("http://youtu.be/")) return cleaned.slice("http://youtu.be/".length);
  match = cleaned.match(/[?&]v=([a-zA-Z0-9_-]{11})(?=[&]|$)/);
  if (match) return match[1];
  return undefined;
}
