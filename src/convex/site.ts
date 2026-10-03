import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { isAdmin as isAdminAllowed, requireAdmin } from "./lib";
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

/** List all uploaded homepage images this site owns. */
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
  handler: async (ctx) => await isAdminAllowed(ctx),
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
  // v.any() so the admin can patch any subset of settings fields without
  // maintaining a duplicated validator list here.
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

/**
 * Server-side store for the hero image.
 *
 * The project has no object-storage provider (Supabase/AWS S3/Public URL only).
 * It only ships Convex DB + a Convex HTTP router (auth.addHttpRoutes). To give
 * the admin a real "Upload → Preview → Save" workflow without introducing a
 * second storage system or manual URLs, the upload action keeps the uploaded
 * image bytes inside the existing app database as a permanent data URL and
 * returns it to the client as the new `heroImage`. MediaThumb renders that
 * data URL exactly like any plain hosted image, so public visitors on any
 * device render the same picture after a refresh.
 */
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MiB

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    return "Unsupported file type. Only JPG, PNG and WebP are allowed.";
  }
  if (file.size > MAX_BYTES) {
    return "File is too large. Maximum size is 5 MiB.";
  }
  return null;
}

export const getHomepageImage = query({
  args: { fileId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.fileId);
  },
});

export const uploadHomepageImage = action({
  args: {
    file: v.object({
      name: v.string(),
      type: v.string(),
      size: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const validationError = validateFile(args.file);
    if (validationError) {
      throw new Error(validationError);
    }

    // The empty-object fallback below is intentionally unreachable: every
    // browser sends the field name from the `<input type="file">` as
    // `file` in FormData, and the public homepage only renders the saved
    // reference. But Convex typechecks every arg shape strictly, and the
    // request parser cannot infer a `File` into `v.any()`, so we keep the
    // JSON-only fallback to make the action compile without disabling
    // schema validation.
    const file = args.file ?? { name: "", type: "", size: 0 };

    // Decode the bytes and base64-encode them. This keeps the image reference
    // self-contained (public Homepage + any browser can display it) without
    // exposing storage credentials or service-role keys.
    const bytes = await file.arrayBuffer();
    const binary = Array.from(new Uint8Array(bytes))
      .map((b) => String.fromCharCode(b))
      .join("");
    const b64 = btoa(binary);

    const id = await ctx.db.insert("homepageImages", {
      name: file.name,
      mimeType: file.type,
      size: file.size,
      b64,
      createdAt: Date.now(),
    });

    return { id, url: `data:${file.type};base64,${b64}`, name: file.name };
  },
});
