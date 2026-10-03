// Small formatting + media helpers shared by the public site and admin.

export function formatDate(ts?: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function timeAgo(ts?: number | null): string {
  if (!ts) return "";
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 96);
}

/** Rough reading time in minutes for article bodies (200 wpm). */
export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Extracts the 11-char video id from any common YouTube URL format. */
export function extractYouTubeId(url?: string | null): string | undefined {
  if (!url) return undefined;
  const cleaned = url.trim();
  let match = cleaned.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  );
  if (match) return match[1];
  match = cleaned.match(/[?&]v=([a-zA-Z0-9_-]{11})(?=[&]|$)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) return cleaned;
  return undefined;
}

/** High-quality YouTube thumbnail (auto-generated, no copyrighted assets). */
export function youtubeThumb(youtubeId?: string | null): string | undefined {
  if (!youtubeId) return undefined;
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

export function parseJsonArray<T>(value: unknown, fallback: T[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export interface Stat {
  label: string;
  value: string;
  suffix?: string;
}

export const DEFAULT_STATS: Stat[] = [
  { label: "YouTube", value: "XX", suffix: "K+" },
  { label: "Facebook", value: "XX", suffix: "K+" },
  { label: "Projects", value: "XX", suffix: "+" },
  { label: "Articles", value: "XX", suffix: "+" },
];

export function isValidHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
