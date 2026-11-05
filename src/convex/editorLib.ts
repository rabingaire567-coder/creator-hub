// ---------------------------------------------------------------------------
// Video editor programme — shared server helpers.
//
// Everything money-related lives here so every caller (editor dashboard, admin
// screens, payment mutations) computes eligible views, rating multipliers and
// earnings with exactly the same rules. All numbers are validated server-side.
// ---------------------------------------------------------------------------

import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { safeJsonParse } from "./lib";

type EditorCtx = QueryCtx | MutationCtx;

export const DEFAULT_WHATSAPP_NUMBER = "";
export const DEFAULT_RATE_PER_THOUSAND = 1;
export const DEFAULT_MIN_PAYOUT = 10;
export const DEFAULT_RATING_THRESHOLDS = [1, 2, 3, 5];
export const DEFAULT_RATING_MULTIPLIERS = [1, 1, 1.1, 1.3, 1.5];

export interface EditorSettings {
  whatsappNumber: string;
  ratePerThousand: number;
  minPayout: number;
  // 4 ascending like/view percentages (e.g. [1, 2, 3, 5]).
  thresholds: number[];
  // 5 multipliers, one per star band.
  multipliers: number[];
}

function normaliseThresholds(value: unknown): number[] {
  const parsed = safeJsonParse<unknown>(value, null);
  if (!Array.isArray(parsed) || parsed.length !== 4) {
    return [...DEFAULT_RATING_THRESHOLDS];
  }
  const numbers = parsed.map((entry) => Number(entry));
  if (numbers.some((n) => !Number.isFinite(n) || n < 0)) {
    return [...DEFAULT_RATING_THRESHOLDS];
  }
  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] <= numbers[i - 1]) {
      return [...DEFAULT_RATING_THRESHOLDS];
    }
  }
  return numbers;
}

function normaliseMultipliers(value: unknown): number[] {
  const parsed = safeJsonParse<unknown>(value, null);
  if (!Array.isArray(parsed) || parsed.length !== 5) {
    return [...DEFAULT_RATING_MULTIPLIERS];
  }
  const numbers = parsed.map((entry) => Number(entry));
  if (numbers.some((n) => !Number.isFinite(n) || n <= 0)) {
    return [...DEFAULT_RATING_MULTIPLIERS];
  }
  return numbers;
}

/** Current editor programme settings (falls back to the documented defaults). */
export async function getEditorSettings(ctx: EditorCtx): Promise<EditorSettings> {
  const settings = await ctx.db.query("siteSettings").first();
  const rawWhatsapp = settings?.whatsappNumber;
  return {
    whatsappNumber:
      typeof rawWhatsapp === "string" ? rawWhatsapp.trim() : DEFAULT_WHATSAPP_NUMBER,
    ratePerThousand:
      typeof settings?.editorRatePerThousand === "number" &&
      settings.editorRatePerThousand >= 0
        ? settings.editorRatePerThousand
        : DEFAULT_RATE_PER_THOUSAND,
    minPayout:
      typeof settings?.editorMinPayout === "number" &&
      settings.editorMinPayout >= 0
        ? settings.editorMinPayout
        : DEFAULT_MIN_PAYOUT,
    thresholds: normaliseThresholds(settings?.editorRatingThresholds),
    multipliers: normaliseMultipliers(settings?.editorRatingMultipliers),
  };
}

export interface RatingBreakdown {
  stars: number;
  multiplier: number;
  ratio: number; // likes ÷ views (0 – 1)
  percent: number; // ratio × 100
}

/**
 * Creator Hub calculated rating — a like-to-view engagement band. This is not
 * an official YouTube rating and every surface labels it as such.
 */
export function ratingFor(
  views: number,
  likes: number,
  settings: EditorSettings,
): RatingBreakdown {
  const safeViews = Math.max(0, views);
  const safeLikes = Math.max(0, likes);
  const ratio = safeViews > 0 ? safeLikes / safeViews : 0;
  const percent = ratio * 100;
  let stars = 1;
  settings.thresholds.forEach((threshold, index) => {
    if (percent >= threshold) stars = Math.min(5, index + 2);
  });
  const multiplier = settings.multipliers[Math.min(stars - 1, 4)] ?? 1;
  return { stars, multiplier, ratio, percent };
}

export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export type PaymentStatus = "unpaid" | "partial" | "paid";

/** A video's live earnings breakdown, derived from stored stats + payments. */
export interface VideoEarnings {
  eligibleViews: number;
  initialViews: number;
  currentViews: number;
  likes: number;
  ratio: number;
  percent: number;
  stars: number;
  multiplier: number;
  ratePerThousand: number;
  baseEarnings: number;
  bonusEarnings: number;
  totalEarnings: number;
  paid: number;
  remaining: number;
  paymentStatus: PaymentStatus;
}

type VideoStatFields = {
  ytViews?: number;
  ytLikes?: number;
  editorInitialViews?: number;
  editorRateSnapshot?: number;
};

/**
 * Eligible views are always current views minus the snapshot taken when the
 * video was assigned, so pre-assignment views never earn anything. Earnings are
 * proportional (a partial 1,000-view increment counts proportionally) and the
 * rating multiplier is applied to the base amount.
 */
export function computeVideoEarnings(
  post: VideoStatFields,
  paid: number,
  settings: EditorSettings,
): VideoEarnings {
  const initialViews = Math.max(0, post.editorInitialViews ?? 0);
  const currentViews = Math.max(0, post.ytViews ?? 0);
  const likes = Math.max(0, post.ytLikes ?? 0);
  const eligibleViews = Math.max(0, currentViews - initialViews);
  const ratePerThousand =
    typeof post.editorRateSnapshot === "number" && post.editorRateSnapshot >= 0
      ? post.editorRateSnapshot
      : settings.ratePerThousand;
  const rating = ratingFor(currentViews, likes, settings);
  const baseEarnings = roundMoney((eligibleViews / 1000) * ratePerThousand);
  const totalEarnings = roundMoney(baseEarnings * rating.multiplier);
  const paidAmount = roundMoney(Math.max(0, paid));
  const remaining = roundMoney(Math.max(0, totalEarnings - paidAmount));
  const paymentStatus: PaymentStatus =
    paidAmount <= 0
      ? "unpaid"
      : paidAmount + 0.005 >= totalEarnings
        ? "paid"
        : "partial";
  return {
    eligibleViews,
    initialViews,
    currentViews,
    likes,
    ratio: rating.ratio,
    percent: rating.percent,
    stars: rating.stars,
    multiplier: rating.multiplier,
    ratePerThousand,
    baseEarnings,
    bonusEarnings: roundMoney(totalEarnings - baseEarnings),
    totalEarnings,
    paid: paidAmount,
    remaining,
    paymentStatus,
  };
}

/** Sum of every payment recorded for an editor, plus per-video totals. */
export async function loadEditorPayments(
  ctx: EditorCtx,
  editorId: Id<"editorProfiles">,
) {
  const payments = await ctx.db
    .query("editorPayments")
    .withIndex("by_editor", (q) => q.eq("editorId", editorId))
    .take(2000);
  const byPost = new Map<string, number>();
  let total = 0;
  for (const payment of payments) {
    total += payment.amount;
    if (payment.postId) {
      const key = payment.postId as string;
      byPost.set(key, (byPost.get(key) ?? 0) + payment.amount);
    }
  }
  return { payments, byPost, total: roundMoney(total) };
}

/**
 * Resolves the editor profile for an account. Profiles are linked by userId
 * once known; until then the admin-entered email is used, so an editor can be
 * set up before they ever sign in.
 */
export async function findEditorForUser(
  ctx: EditorCtx,
  userId: Id<"users">,
): Promise<Doc<"editorProfiles"> | null> {
  const linked = await ctx.db
    .query("editorProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (linked) return linked;
  const user = await ctx.db.get(userId);
  const rawEmail = user?.email;
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (!email) return null;
  const profiles = await ctx.db.query("editorProfiles").take(500);
  return (
    profiles.find(
      (profile) => (profile.email ?? "").trim().toLowerCase() === email,
    ) ?? null
  );
}

/** Throws unless the caller is an active editor; returns only their profile. */
export async function requireEditor(
  ctx: EditorCtx,
): Promise<Doc<"editorProfiles">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Unauthorized");
  const editor = await findEditorForUser(ctx, userId);
  if (!editor) {
    throw new Error(
      "No editor profile is linked to this account. Ask the site owner to add you as an editor.",
    );
  }
  if (editor.status === "disabled") {
    throw new Error("Your editor account has been disabled.");
  }
  return editor;
}

/** Trims a WhatsApp number to digits, keeping a leading country-code "+". */
export function normaliseWhatsappNumber(input: string): string {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus && digits ? `+${digits}` : digits;
}

/** Basic image data-URL validation used for editor photos and eSewa QR codes. */
export function isImageDataUrl(value: string): boolean {
  return /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=\s]+$/.test(value);
}

export function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return 0;
  return Math.floor(((dataUrl.length - comma - 1) * 3) / 4);
}

/** Rating label shared by the dashboard cards and admin tables. */
export function ratingLabel(stars: number): string {
  return `${stars} star${stars === 1 ? "" : "s"}`;
}
