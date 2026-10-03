import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

// ---- Queries ----

export const getSiteSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("siteSettings").first();
    if (!settings) {
      return {
        title: "Rabin Gaire",
        tagline: "Exploring ideas, technology, Nepal and the stories behind them.",
        description:
          "A warm, colourful creator platform covering technology, education, Nepal, science, documentary storytelling and digital creativity.",
        accent1: "#E0703A",
        accent2: "#E8A33D",
        accent3: "#C97B2E",
        accent4: "#7A9E6E",
        accent5: "#6E8BAC",
        accentText: "#F6F1E7",
        bgHero: "#1F1816",
        bgSurface: "#2A211B",
        textPrimary: "#F6F1E7",
        textSecondary: "#B9A99A",
        border: "#4A3E34",
        theme: "dark",
        footerText: "© 2026 Rabin Gaire. Built with care.",
        heroHeading: "Exploring ideas, technology, Nepal and the stories behind them.",
        heroSubtext: "Creator • Storyteller • Developer",
        heroCtaPrimary: "Watch Latest",
        heroCtaPrimaryHref: "/content",
        heroCtaSecondary: "Explore My Work",
        heroCtaSecondaryHref: "/projects",
        introduction:
          "Hi, I'm Rabin Gaire. I build things with code and tell stories with film — exploring technology, learning, Nepal, education and science, and the human side of them all.",
        stats: JSON.stringify([
          { label: "YouTube", value: "60+", suffix: "+" },
          { label: "Facebook", value: "30+", suffix: "+" },
          { label: "Projects", value: "12", suffix: "+" },
          { label: "Articles", value: "40+", suffix: "+" },
        ]),
        heroImage: undefined,
        featuredContent: undefined,
        currentProject: undefined,
        siteUrl: "https://rabingaire.com",
        logoName: undefined,
      } as any;
    }
    return settings as any;
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
    return await ctx.db.query("tags").filter((q) => q.eq(q.field("name"), args.name)).first();
  },
});

// ---- Mutations ----

export const updateSiteSettings = mutation({
  args: { patch: v.object({}) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const existing = await ctx.db.query("siteSettings").first();
    const update: Record<string, unknown> = { ...args.patch };
    if (update.accent1 && !update.accent2) update.accent2 = update.accent1;
    if (update.accent2 && !update.accent3) update.accent3 = update.accent2;
    if (update.accent3 && !update.accent4) update.accent4 = update.accent3;
    if (update.accent4 && !update.accent5) update.accent5 = update.accent4;
    await ctx.db.patch("siteSettings", { ...existing, ...update });
    return true;
  },
});

export const upsertSiteSettings = mutation({
  args: { patch: v.object({}) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const existing = await ctx.db.query("siteSettings").first();
    const update: Record<string, unknown> = { ...args.patch };
    if (update.accent1 && !update.accent2) update.accent2 = update.accent1;
    if (update.accent2 && !update.accent3) update.accent3 = update.accent2;
    if (update.accent3 && !update.accent4) update.accent4 = update.accent3;
    if (update.accent4 && !update.accent5) update.accent5 = update.accent4;
    if (existing) {
      await ctx.db.patch("siteSettings", { ...existing, ...update });
    } else {
      await ctx.db.insert("siteSettings", {
        ...update,
        createdAt: Date.now(),
      });
    }
    return true;
  },
});

export const deleteSiteSettings = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const record = await ctx.db.query("siteSettings").first();
    if (record) {
      await ctx.db.delete(record._id);
    }
    return true;
  },
});
