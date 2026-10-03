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
export type Role = Infer<typeof roleValidator>;

// ---------------------------------------------------------------------------
// Website / site settings
// ---------------------------------------------------------------------------
const siteSettingsTable = defineTable(
  {
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
    theme: v.optional(v.literal("dark", "light", "system")),
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
    stats: v.string(), // JSON array of { label, value, suffix? }
    featuredContent: v.optional(v.string()), // JSON id[] of featured posts
    currentProject: v.optional(v.string()), // JSON id of the current project
    siteUrl: v.optional(v.string()),
    defaultStatus: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  },
  {
    index: "byTitle",
    keys: ["title"],
  }
);

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------
const tagsTable = defineTable(
  {
    name: v.string(),
    slug: v.string(),
    color: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
  },
  {
    index: "bySlug",
    keys: ["slug"],
  }
);

// ---------------------------------------------------------------------------
// Posts (videos / video content) — the core public content
// ---------------------------------------------------------------------------
const postsTable = defineTable(
  {
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
  },
  {
    index: "byCategories",
    keys: ["categories"],
  },
  {
    index: "byFeatured",
    keys: ["featured"],
  },
  {
    index: "byPublished",
    keys: ["published"],
  }
);

// ---------------------------------------------------------------------------
// Articles — full editorial blog posts
// ---------------------------------------------------------------------------
const articlesTable = defineTable(
  {
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
  },
  {
    index: "bySlug",
    keys: ["slug"],
  },
  {
    index: "byPublished",
    keys: ["published"],
  },
  {
    index: "byCategory",
    keys: ["category"],
  }
);

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
const projectsTable = defineTable(
  {
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
  },
  {
    index: "byStatus",
    keys: ["status"],
  },
  {
    index: "byFeatured",
    keys: ["featured"],
  },
  {
    index: "byPublished",
    keys: ["published"],
  }
);

// ---------------------------------------------------------------------------
// Social links
// ---------------------------------------------------------------------------
const socialLinksTable = defineTable(
  {
    platform: v.string(),
    label: v.string(),
    url: v.string(),
    enabled: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  {
    index: "byPlatform",
    keys: ["platform"],
  },
  {
    index: "byOrder",
    keys: ["order"],
  }
);

// ---------------------------------------------------------------------------
// Community submissions
// ---------------------------------------------------------------------------
const communitySubmissionsTable = defineTable(
  {
    name: v.string(),
    email: v.string(),
    suggestion: v.string(),
    category: v.string(),
    status: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  },
  {
    index: "byStatus",
    keys: ["status"],
  },
  {
    index: "byEmail",
    keys: ["email"],
  }
);

// ---------------------------------------------------------------------------
// Contact messages
// ---------------------------------------------------------------------------
const contactMessagesTable = defineTable(
  {
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    category: v.string(),
    message: v.string(),
    status: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  },
  {
    index: "byStatus",
    keys: ["status"],
  },
  {
    index: "byEmail",
    keys: ["email"],
  }
);

// ---------------------------------------------------------------------------
// Root schema
// ---------------------------------------------------------------------------
export default defineSchema(
  {
    ...authTables,

    // add other tables here
    siteSettings: siteSettingsTable,
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

export type SiteSettings = Infer<typeof siteSettingsTable>;
export type Tag = Infer<typeof tagsTable>;
export type Post = Infer<typeof postsTable>;
export type Article = Infer<typeof articlesTable>;
export type Project = Infer<typeof projectsTable>;
export type SocialLink = Infer<typeof socialLinksTable>;
export type CommunitySubmission = Infer<typeof communitySubmissionsTable>;
export type ContactMessage = Infer<typeof contactMessagesTable>;
