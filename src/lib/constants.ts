// Shared, editable-from-admin option lists for the whole product.

export const CONTENT_CATEGORIES = [
  "Documentary",
  "Explainer",
  "Nepal",
  "Technology",
  "Education",
  "Science",
  "Society",
  "Shorts",
] as const;

export const PROJECT_CATEGORIES = [
  "Web App",
  "Education",
  "Developer Tools",
  "Creative",
  "Open Source",
  "Experiment",
] as const;

export const PROJECT_STATUSES = [
  "Idea",
  "Building",
  "Completed",
  "Archived",
] as const;

// Categories for the standalone 📄 PDF Library (separate from content types).
export const PDF_CATEGORIES = [
  "Guides",
  "Templates",
  "Tutorials",
  "Cheat Sheets",
  "Reports",
  "eBooks",
] as const;

export const CONTACT_CATEGORIES = [
  "Brand Collaboration",
  "Content Collaboration",
  "Web Development",
  "Creative Projects",
  "Speaking",
  "General Inquiry",
] as const;

export const SUGGESTION_CATEGORIES = [
  "Video Idea",
  "Article Idea",
  "Question",
  "Feedback",
  "Collaboration",
  "Other",
] as const;

export const SOCIAL_PLATFORMS = [
  "YouTube",
  "Facebook",
  "Instagram",
  "TikTok",
  "GitHub",
  "X (Twitter)",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/** Default URL patterns used when the admin adds a new social link. */
export const SOCIAL_URL_PLACEHOLDERS: Record<SocialPlatform, string> = {
  YouTube: "https://youtube.com/@yourchannel",
  Facebook: "https://facebook.com/yourpage",
  Instagram: "https://instagram.com/yourhandle",
  TikTok: "https://tiktok.com/@yourhandle",
  GitHub: "https://github.com/yourhandle",
  "X (Twitter)": "https://x.com/yourhandle",
};

/** Warm per-category accent used for chips and thumbnail fallbacks. */
export const CATEGORY_TONES: Record<string, string> = {
  Documentary: "bg-clay/15 text-clay border-clay/25",
  Explainer: "bg-gold/15 text-gold border-gold/25",
  Nepal: "bg-ember/15 text-ember border-ember/25",
  Technology: "bg-dusk/15 text-dusk border-dusk/25",
  Education: "bg-sage/15 text-sage border-sage/25",
  Science: "bg-dusk/15 text-dusk border-dusk/25",
  Society: "bg-clay/15 text-clay border-clay/25",
  Shorts: "bg-gold/15 text-gold border-gold/25",
};

export function toneForCategory(category?: string): string {
  if (!category) return "bg-ember/15 text-ember border-ember/25";
  return CATEGORY_TONES[category] ?? "bg-ember/15 text-ember border-ember/25";
}
