import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ---- Queries ----

export const listProjects = query({
  args: {
    filter: v.optional(v.string()),
    category: v.optional(v.string()),
    status: v.optional(v.string()),
    featuredOnly: v.optional(v.boolean()),
    page: v.optional(v.number()),
    perPage: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("projects");

    if (args.featuredOnly) {
      q = q.filter((doc) => (doc.featured as boolean | undefined) === true);
    } else {
      q = q.filter((doc) => (doc.published as boolean | undefined) === true);
    }

    if (args.category) {
      q = q.filter((doc) => doc.category === args.category);
    }
    if (args.status) {
      q = q.filter((doc) => doc.status === args.status);
    }
    if (args.filter) {
      const term = args.filter.toLowerCase();
      q = q.filter((doc) => {
        const text = `${doc.name ?? ""} ${(doc.description ?? "") as string} ${doc.category ?? ""} ${((doc.technologies as string[] | undefined)?.join(" ") ?? "")}`
          .toLowerCase();
        return text.includes(term);
      });
    }

    const all = await q.order("desc").take(300);
    const total = all.length;
    const start = (args.page ?? 1 - 1) * 20;
    const items = start >= total ? [] : all.slice(start, start + 20);
    return { items, total };
  },
});

export const getProjectById = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) return null;
    if (!project.published) return null;
    return project as any;
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
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
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
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
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
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    await ctx.db.delete(args.id);
    return true;
  },
});

export const setProjectPublished = mutation({
  args: { id: v.id("projects"), published: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Project not found");
    await ctx.db.patch(args.id, { published: args.published });
    return true;
  },
});

export const setProjectFeatured = mutation({
  args: { id: v.id("projects"), featured: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const record = await ctx.db.get(args.id);
    if (!record) throw new Error("Project not found");
    await ctx.db.patch(args.id, { featured: args.featured });
    return true;
  },
});
