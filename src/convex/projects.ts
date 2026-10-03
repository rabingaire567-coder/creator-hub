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

function textOf(project: {
  name: string;
  description: string;
  category: string;
  technologies: string[];
}): string {
  return `${project.name} ${project.description} ${project.category} ${project.technologies.join(" ")}`.toLowerCase();
}

// ---- Queries ----

export const listProjects = query({
  args: {
    filter: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(v.string()),
    featuredOnly: v.optional(v.boolean()),
    // Admin: include drafts as well as published items
    includeDrafts: v.optional(v.boolean()),
    page: v.optional(v.number()),
    perPage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("projects").take(MAX_DOCS);

    // Drafts never leave the server unless the caller is the site owner, and
    // "featured only" narrows the published set instead of replacing it.
    const includeDrafts = args.includeDrafts === true && (await isAdmin(ctx));
    let items = all;
    if (!includeDrafts) {
      items = items.filter((project) => project.published === true);
    }
    if (args.featuredOnly) {
      items = items.filter((project) => project.featured === true);
    }

    if (args.category) {
      items = items.filter((project) => project.category === args.category);
    }
    if (args.status) {
      items = items.filter((project) => project.status === args.status);
    }
    if (args.filter) {
      const term = args.filter.toLowerCase();
      items = items.filter((project) => textOf(project).includes(term));
    }

    items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

    return paginate(items, args.page);
  },
});

export const getProjectById = query({
  // Raw string: URL params may contain malformed ids (see safeGet).
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const project = await safeGet<Doc<"projects">>(ctx.db, args.id);
    if (!project) return null;
    if (project.published !== true) return null;
    return project;
  },
});

export const listFeaturedProjects = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("projects").take(MAX_DOCS);
    return all
      .filter((project) => project.published === true && project.featured === true)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 6);
  },
});

// ---- Mutations ----

export const createProject = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    thumbnail: v.optional(v.string()),
    category: v.string(),
    technologies: v.array(v.string()),
    githubUrl: v.optional(v.string()),
    liveUrl: v.optional(v.string()),
    status: v.optional(v.string()),
    progress: v.optional(v.number()),
    featured: v.optional(v.boolean()),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      thumbnail: args.thumbnail,
      category: args.category,
      technologies: args.technologies,
      githubUrl: args.githubUrl,
      liveUrl: args.liveUrl,
      status: args.status ?? "Idea",
      progress: args.progress ?? 0,
      featured: args.featured ?? false,
      published: args.published ?? false,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const updateProject = mutation({
  args: {
    id: v.id("projects"),
    patch: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      thumbnail: v.optional(v.string()),
      category: v.optional(v.string()),
      technologies: v.optional(v.array(v.string())),
      githubUrl: v.optional(v.string()),
      liveUrl: v.optional(v.string()),
      status: v.optional(v.string()),
      progress: v.optional(v.number()),
      featured: v.optional(v.boolean()),
      published: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Project not found");
    await ctx.db.patch(args.id, {
      ...args.patch,
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const deleteProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
    return true;
  },
});

export const setProjectPublished = mutation({
  args: { id: v.id("projects"), published: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Project not found");
    await ctx.db.patch(args.id, { published: args.published });
    return true;
  },
});

export const setProjectFeatured = mutation({
  args: { id: v.id("projects"), featured: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Project not found");
    await ctx.db.patch(args.id, { featured: args.featured });
    return true;
  },
});
