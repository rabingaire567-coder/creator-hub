import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ensureArray, safeJsonParse } from "./lib";

// ---- Queries ----

export const listPosts = query({
  args: {
    filter: v.optional(v.string()),
    category: v.optional(v.string()),
    tag: v.optional(v.string()),
    featuredOnly: v.optional(v.boolean()),
    sort: v.optional(v.string()),
    page: v.optional(v.number()),
    perPage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("posts");

    if (args.featuredOnly) {
      q = q.filter((doc) => doc.featured === true);
    } else {
      q = q.filter((doc) => doc.published === true);
    }

    if (args.category) {
      q = q.filter((doc) =>
        (doc.categories as string[] | undefined)?.includes(args.category) ?? false,
      );
    }
    if (args.tag) {
      q = q.filter((doc) => (doc.tags as string[] | undefined)?.includes(args.tag) ?? false);
    }
    if (args.filter) {
      const term = args.filter.toLowerCase();
      q = q.filter((doc) => {
        const text = `${doc.title ?? ""} ${(doc.excerpt ?? "") as string} ${(doc.description ?? "") as string} ${((doc.categories as string[] | undefined)?.join(" ") ?? "")}`
          .toLowerCase();
        return text.includes(term);
      });
    }

    if (args.sort === "views") q = q.order("desc");
    else if (args.sort === "createdAt") q = q.order("desc");
    else q = q.order("desc");

    const all = await q.order("desc").take(300);
    const total = all.length;
    const start = (args.page ?? 1 - 1) * 20;
    const items = start >= total ? [] : all.slice(start, start + 20);
    return { items, total };
  },
});

export const listFeaturedPosts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx
      .db.query("posts")
      .filter((doc) => (doc.published as boolean | undefined) === true && (doc.featured as boolean | undefined) === true)
      .order("desc")
      .take(6);
  },
});

export const listLatestPosts = query({
  args: {},
  handler: async (ctx) => {
    return await ctx
      .db.query("posts")
      .filter((doc) => (doc.published as boolean | undefined) === true)
      .order("desc")
      .take(6);
  },
});

export const getPostById = query({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.id);
    if (!post) return null;
    if (!((post.published as boolean | undefined) === true) && !post.publishedAt) return null;
    return post as any;
  },
});

export const getPostByYoutubeId = query({
  args: { youtubeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx
      .db.query("posts")
      .filter((doc) => (doc.youtubeId as string | undefined) === args.youtubeId && (doc.published as boolean | undefined) === true)
      .first();
  },
});

export const getPostBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx
      .db.query("posts")
      .filter((doc) => (doc.title as string | undefined)?.toLowerCase() === args.slug.toLowerCase())
      .filter((doc) => (doc.published as boolean | undefined) === true)
      .first();
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
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
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
      status: args.status ?? "draft",
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
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Post not found");
    if (args.patch.youtubeUrl && !args.patch.youtubeId) {
      const youtubeId = extractYouTubeId(args.patch.youtubeUrl);
      args.patch.youtubeId = youtubeId;
    }
    await ctx.db.patch(args.id, {
      ...args.patch,
      updatedAt: Date.now(),
      publishedAt: args.patch.published ? Date.now() : record.publishedAt,
    });
    return true;
  },
});

export const deletePost = mutation({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    await ctx.db.delete(args.id);
    return true;
  },
});

export const setPostPublished = mutation({
  args: { id: v.id("posts"), published: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Post not found");
    await ctx.db.patch(args.id, {
      published: args.published,
      publishedAt: args.published ? Date.now() : undefined,
    });
    return true;
  },
});

export const setPostFeatured = mutation({
  args: { id: v.id("posts"), featured: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
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
