import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAdmin } from "./lib";
import type { SiteSettings } from "./schema";

// ---- Defaults (used when no settings row exists yet) ----
export const DEFAULT_SETTINGS: Omit<SiteSettings, "createdAt"> = {
  title: "Rabin Gaire",
  tagline: "Exploring ideas, technology, Nepal and the stories behind them.",
  description:
    "A warm, colourful creator platform covering technology, education, Nepal, science, documentary storytelling and digital creativity.",
  accent1: "#E0703A",
  accent2: "#E8A33D",
  accent3: "#C97B2E",
  accent4: "#C97B2E",
  accent5: "#6E8BAC",
  accentText: "#F6F1E7",
  bgHero: "#1F1816",
  bgSurface: "#2A211B",
  textPrimary: "#F6F1E7",
  textSecondary: "#B9A99A",
  border: "#4A3E34",
  theme: "dark",
  footerText: "© 2026 Rabin Gaire. Built with care.",
  heroHeading:
    "Exploring ideas, technology, Nepal and the stories behind them.",
  heroSubtext: "Creator • Storyteller • Developer",
  heroCtaPrimary: "Watch Latest",
  heroCtaPrimaryHref: "/content",
  heroCtaSecondary: "Explore My Work",
  heroCtaSecondaryHref: "/projects",
  introduction:
    "Hi, I'm Rabin Gaire. I build things with code and tell stories with film — exploring technology, learning, Nepal, education and science, and the human side of them all.",
  stats: JSON.stringify([
    { label: "YouTube", value: "XX", suffix: "K+" },
    { label: "Facebook", value: "XX", suffix: "K+" },
    { label: "Projects", value: "XX", suffix: "+" },
    { label: "Articles", value: "XX", suffix: "+" },
  ]),
  aboutSections: JSON.stringify([
    {
      title: "Who I Am",
      body: "I'm Rabin Gaire — a creator and developer who loves understanding how things work, then explaining them clearly. I live at the intersection of film, code and curiosity.",
    },
    {
      title: "What I Create",
      body: "Documentaries and explainers about technology, education, science and life in Nepal — plus web projects that try to make learning a little easier.",
    },
    {
      title: "What I Am Learning",
      body: "Storytelling craft, better editing, and the engineering behind the products I use every day. Learning in public is part of the point.",
    },
    {
      title: "Why I Create",
      body: "Because good explanations change what people believe is possible — especially for students and young creators in Nepal.",
    },
    {
      title: "My Vision",
      body: "A body of work that compounds: films, articles and tools that help people stay curious for years to come.",
    },
  ]),
  timeline: JSON.stringify([
    { label: "Student", note: "Curious about science, technology and the wider world." },
    { label: "Creator", note: "Started filming and publishing stories online." },
    { label: "Developer", note: "Building web projects and learning in public." },
    { label: "Builder", note: "Shipping products that solve real problems." },
    { label: "Future", note: "A trusted platform for ideas from Nepal to the world." },
  ]),
  siteUrl: "https://rabingaire.com",
};

// ---- Queries ----

export const getSiteSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("siteSettings").first();
    return settings ?? (DEFAULT_SETTINGS as SiteSettings);
  },
});

export const listHomepageImages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("homepageImages").order("desc").collect();
  },
});

export const listHomepageImagesApi = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("homepageImages").order("desc").collect();
  },
});

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    return await requireAdmin(ctx).then(() => true).catch(() => false);
  },
});

export const getAllTags = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tags").order("desc").collect();
  },
});

export const getTagByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tags")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
  },
});

// ---- Mutations ----

export const upsertSiteSettings = mutation({
  args: { patch: v.any() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const patch = (args.patch ?? {}) as Partial<SiteSettings>;
    const existing = await ctx.db.query("siteSettings").first();
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("siteSettings", {
        ...DEFAULT_SETTINGS,
        ...patch,
        createdAt: Date.now(),
      });
    }
    return true;
  },
});

export const updateSiteSettings = mutation({
  args: { patch: v.any() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const patch = (args.patch ?? {}) as Partial<SiteSettings>;
    const existing = await ctx.db.query("siteSettings").first();
    if (!existing) {
      await ctx.db.insert("siteSettings", {
        ...DEFAULT_SETTINGS,
        ...patch,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.patch(existing._id, patch);
    }
    return true;
  },
});

export const deleteSiteSettings = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const record = await ctx.db.query("siteSettings").first();
    if (record) {
      await ctx.db.delete(record._id);
    }
    return true;
  },
});

// ---- Homepage image upload ----
//
// The image is saved as a base64 data URL inside a Convex document (the
// public homepage renders `siteSettings.heroImage` as-is), so the raw file is
// capped well below Convex's 1 MiB document/value limit: 600 KB raw becomes
// ~800 KB of base64, leaving room for the rest of the document.

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_IMAGE_BYTES = 600 * 1024;

function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return 0;
  return Math.floor(((dataUrl.length - comma - 1) * 3) / 4);
}

export const getHomepageImage = query({
  args: { fileId: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.fileId as string as never);
    return record ?? null;
  },
});

/**
 * Stores an uploaded homepage image and returns its permanent reference.
 * The admin client reads + compresses the picked file into a data URL and
 * passes it here; `requireAdmin` gates who may upload.
 */
export const uploadHomepageImage = mutation({
  args: {
    name: v.string(),
    mimeType: v.string(),
    dataUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!(ALLOWED_TYPES as readonly string[]).includes(args.mimeType)) {
      throw new Error("Unsupported file type. Only JPG, PNG and WebP are allowed.");
    }
    if (!args.dataUrl.startsWith(`data:${args.mimeType};base64,`)) {
      throw new Error("Invalid image data.");
    }
    const size = dataUrlByteLength(args.dataUrl);
    if (size > MAX_IMAGE_BYTES) {
      throw new Error("Image is too large. Maximum size is 600 KB.");
    }
    const id = await ctx.db.insert("homepageImages", {
      url: args.dataUrl,
      name: args.name,
      mimeType: args.mimeType,
      size,
      fileId: "",
      createdAt: Date.now(),
    });
    // `fileId` doubles as a handle for `getHomepageImage`.
    await ctx.db.patch(id, { fileId: id });
    return { id, url: args.dataUrl, name: args.name };
  },
});
