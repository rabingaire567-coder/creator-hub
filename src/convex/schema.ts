import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);

// ---------------------------------------------------------------------------
// Website / site settings (single row)
// ---------------------------------------------------------------------------
const siteSettingsTable = defineTable({
  title: v.string(), // e.g. "Rabin Gaire"
  tagline: v.string(),
  description: v.string(),
  logoName: v.optional(v.string()), // visible name of the logo (derived from site title if omitted)
  accent1: v.string(), // primary warm colour (e.g. #E0703A)
  accent2: v.string(), // secondary warm colour (e.g. #E8A33D)
  accent3: v.string(), // third warm colour (e.g. #C97B2E)
  accent4: v.string(), // fourth warm colour (e.g. #C97B2E)
  accent5: v.string(), // fifth warm colour (e.g. #6E8BAC)
  accentText: v.string(), // warm text colour for light/warm backgrounds
  bgHero: v.string(), // hero background colour
  bgSurface: v.string(), // content surface colour
  textPrimary: v.string(), // primary text
  textSecondary: v.string(), // secondary text
  border: v.string(),
  favicon: v.optional(v.string()),
  theme: v.optional(v.union(v.literal("dark"), v.literal("light"), v.literal("system"))),
  ogImage: v.optional(v.string()),
  metaTitle: v.optional(v.string()),
  metaDescription: v.optional(v.string()),
  canonicalBase: v.optional(v.string()),
  footerText: v.string(),
  heroHeading: v.string(),
  heroSubtext: v.string(),
  heroCtaPrimary: v.string(),
  heroCtaPrimaryHref: v.string(),
  heroCtaSecondary: v.string(),
  heroCtaSecondaryHref: v.string(),
  heroImage: v.optional(v.string()),
  introduction: v.string(),
  // ---- Creator introduction (top of the public homepage) ----
  // The uploaded portrait is stored as a data URL via `uploadHomepageImage`,
  // exactly like `heroImage`. All fields are optional: the homepage falls
  // back to sensible defaults derived from the site settings.
  creatorPhoto: v.optional(v.string()),
  creatorName: v.optional(v.string()),
  creatorTagline: v.optional(v.string()),
  creatorIntro: v.optional(v.string()),
  creatorCtaLabel: v.optional(v.string()),
  creatorCtaHref: v.optional(v.string()),
  creatorYoutube: v.optional(v.string()),
  stats: v.string(), // JSON array of { label, value, suffix? }
  aboutSections: v.optional(v.string()), // JSON array of { title, body }
  timeline: v.optional(v.string()), // JSON array of { label, note }
  featuredContent: v.optional(v.string()), // JSON id[] of featured posts
  currentProject: v.optional(v.string()), // JSON id of the current project
  siteUrl: v.optional(v.string()),
  defaultStatus: v.optional(v.string()),
  // The single owner/admin email. When set, only that account may run
  // admin mutations. When unset, any signed-in account may bootstrap settings.
  adminEmail: v.optional(v.string()),
  createdAt: v.optional(v.number()),
}).index("by_title", ["title"]);

// ---------------------------------------------------------------------------
// Uploaded homepage images (server-side store for the hero image)
// ---------------------------------------------------------------------------
const homepageImagesTable = defineTable({
  // The permanent image reference. Uploaded by the admin via
  // `api.site.uploadHomepageImage`; a base64 data URL so public visitors on
  // any device render the same picture with no storage credentials needed.
  url: v.string(),
  name: v.string(),
  mimeType: v.string(),
  size: v.number(),
  // Kept so the admin can remove a chosen file from the file list.
  fileId: v.string(),
  createdAt: v.number(),
});

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------
const tagsTable = defineTable({
  name: v.string(),
  slug: v.string(),
  color: v.optional(v.string()),
  enabled: v.optional(v.boolean()),
  createdAt: v.optional(v.number()),
})
  .index("by_slug", ["slug"])
  .index("by_name", ["name"]);

// ---------------------------------------------------------------------------
// Posts (videos / video content) — the core public content
// ---------------------------------------------------------------------------
const postsTable = defineTable({
  title: v.string(),
  excerpt: v.string(),
  description: v.string(),
  // video
  youtubeId: v.optional(v.string()),
  youtubeUrl: v.optional(v.string()),
  // media
  thumbnail: v.optional(v.string()),
  duration: v.optional(v.string()),
  // taxonomy
  categories: v.array(v.string()),
  tags: v.array(v.string()),
  featured: v.optional(v.boolean()),
  published: v.optional(v.boolean()),
  status: v.optional(v.string()),
  publishedAt: v.optional(v.number()),
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
  // misc
  views: v.optional(v.number()),
})
  .index("by_categories", ["categories"])
  .index("by_featured", ["featured"])
  .index("by_published", ["published"]);

// ---------------------------------------------------------------------------
// Articles — full editorial blog posts
// ---------------------------------------------------------------------------
const articlesTable = defineTable({
  title: v.string(),
  slug: v.string(),
  excerpt: v.string(),
  cover: v.optional(v.string()),
  content: v.string(),
  category: v.string(),
  tags: v.array(v.string()),
  author: v.string(),
  publishedAt: v.optional(v.number()),
  createdAt: v.optional(v.number()),
  readingTime: v.optional(v.number()),
  featured: v.optional(v.boolean()),
  published: v.optional(v.boolean()),
})
  .index("by_slug", ["slug"])
  .index("by_published", ["published"])
  .index("by_category", ["category"]);

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
const projectsTable = defineTable({
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
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
})
  .index("by_status", ["status"])
  .index("by_featured", ["featured"])
  .index("by_published", ["published"]);

// ---------------------------------------------------------------------------
// Social links
// ---------------------------------------------------------------------------
const socialLinksTable = defineTable({
  platform: v.string(),
  label: v.string(),
  url: v.string(),
  enabled: v.optional(v.boolean()),
  order: v.optional(v.number()),
})
  .index("by_platform", ["platform"])
  .index("by_order", ["order"]);

// ---------------------------------------------------------------------------
// Community submissions
// ---------------------------------------------------------------------------
const communitySubmissionsTable = defineTable({
  name: v.string(),
  email: v.string(),
  suggestion: v.string(),
  category: v.string(),
  status: v.optional(v.string()),
  createdAt: v.optional(v.number()),
})
  .index("by_status", ["status"])
  .index("by_email", ["email"]);

// ---------------------------------------------------------------------------
// Contact messages
// ---------------------------------------------------------------------------
const contactMessagesTable = defineTable({
  name: v.string(),
  email: v.string(),
  subject: v.string(),
  category: v.string(),
  message: v.string(),
  status: v.optional(v.string()),
  createdAt: v.optional(v.number()),
})
  .index("by_status", ["status"])
  .index("by_email", ["email"]);

// ---------------------------------------------------------------------------
// Root schema
// ---------------------------------------------------------------------------
export default defineSchema(
  {
    ...authTables,

    // content tables
    siteSettings: siteSettingsTable,
    homepageImages: homepageImagesTable,
    tags: tagsTable,
    posts: postsTable,
    articles: articlesTable,
    projects: projectsTable,
    socialLinks: socialLinksTable,
    communitySubmissions: communitySubmissionsTable,
    contactMessages: contactMessagesTable,
  },
  {
    schemaValidation: false,
  }
);

export type SiteSettings = Infer<(typeof siteSettingsTable)["validator"]>;
export type HomepageImage = Infer<(typeof homepageImagesTable)["validator"]>;
export type Tag = Infer<(typeof tagsTable)["validator"]>;
export type Post = Infer<(typeof postsTable)["validator"]>;
export type Article = Infer<(typeof articlesTable)["validator"]>;
export type Project = Infer<(typeof projectsTable)["validator"]>;
export type SocialLink = Infer<(typeof socialLinksTable)["validator"]>;
export type CommunitySubmission = Infer<(typeof communitySubmissionsTable)["validator"]>;
export type ContactMessage = Infer<(typeof contactMessagesTable)["validator"]>;
