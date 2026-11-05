// ---------------------------------------------------------------------------
// Video editor programme — profiles, assignments, earnings, payouts.
//
// Security model:
//   * Every editor-facing function resolves the caller with getAuthUserId and
//     only ever returns data for their own editor profile. There is no
//     parameter that lets an editor ask for somebody else's records.
//   * Every admin/... function goes through requireAdmin (site owner only).
//     Only admins can assign videos, change rates, record payments or review
//     payment requests.
//   * All earnings and payment arithmetic is recomputed on the server from the
//     stored YouTube statistics and the append-only payment ledger; the client
//     never submits a total it can influence.
// ---------------------------------------------------------------------------

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  computeVideoEarnings,
  dataUrlByteLength,
  findEditorForUser,
  getEditorSettings,
  isImageDataUrl,
  loadEditorPayments,
  normaliseWhatsappNumber,
  requireEditor,
  roundMoney,
  type EditorSettings,
  type VideoEarnings,
} from "./editorLib";
import { isAdmin, requireAdmin } from "./lib";
import { ensureProfile } from "./members";
import { DEFAULT_SETTINGS } from "./site";

const MAX_POSTS = 1000;
const MAX_REQUESTS = 500;
const QR_MAX_BYTES = 450 * 1024;
const PHOTO_MAX_BYTES = 400 * 1024;
const SOL = 0.005; // floating point tolerance for money comparisons

function roundViews(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function youtubeConfigured(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

// ---------------------------------------------------------------------------
// Shared aggregation
// ---------------------------------------------------------------------------

interface Totals {
  assignedVideos: number;
  totalViews: number;
  eligibleViews: number;
  totalEarned: number;
  totalPaid: number;
  outstanding: number;
  avgRating: number;
  pendingRequests: number;
}

function summarise(
  posts: Doc<"posts">[],
  payments: Doc<"editorPayments">[],
  requests: Doc<"paymentRequests">[],
  settings: EditorSettings,
): { rows: Array<{ post: Doc<"posts">; earnings: VideoEarnings }>; totals: Totals } {
  const byPost = new Map<string, number>();
  let totalPaid = 0;
  for (const payment of payments) {
    totalPaid += payment.amount;
    if (payment.postId) {
      const key = payment.postId as string;
      byPost.set(key, (byPost.get(key) ?? 0) + payment.amount);
    }
  }
  const rows = posts.map((post) => ({
    post,
    earnings: computeVideoEarnings(
      post,
      byPost.get(post._id as string) ?? 0,
      settings,
    ),
  }));
  const rated = rows.filter((row) => row.earnings.currentViews > 0);
  const avgRating = rated.length
    ? rated.reduce((sum, row) => sum + row.earnings.stars, 0) / rated.length
    : 0;
  const totalEarned = roundMoney(
    rows.reduce((sum, row) => sum + row.earnings.totalEarnings, 0),
  );
  const paid = roundMoney(totalPaid);
  return {
    rows,
    totals: {
      assignedVideos: rows.length,
      totalViews: rows.reduce((sum, row) => sum + row.earnings.currentViews, 0),
      eligibleViews: rows.reduce(
        (sum, row) => sum + row.earnings.eligibleViews,
        0,
      ),
      totalEarned,
      totalPaid: paid,
      outstanding: roundMoney(Math.max(0, totalEarned - paid)),
      avgRating: Math.round(avgRating * 10) / 10,
      pendingRequests: requests.filter((r) => r.status === "pending").length,
    },
  };
}

async function loadEditorRequests(
  ctx: QueryCtx,
  editorId: Id<"editorProfiles">,
) {
  return await ctx.db
    .query("paymentRequests")
    .withIndex("by_editor", (q) => q.eq("editorId", editorId))
    .order("desc")
    .take(MAX_REQUESTS);
}

/** Builds a valid, unused username from the member's display name/email. */
async function uniqueEditorUsername(
  ctx: MutationCtx,
  userId: Id<"users">,
  name: string,
  email: string,
): Promise<string> {
  const source = (name || email.split("@")[0] || "editor")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 24);
  const base =
    source.length >= 3 ? source : `editor.${userId.slice(-6)}`;
  let candidate = base;
  for (let attempt = 2; attempt < 60; attempt += 1) {
    const clash = await ctx.db
      .query("editorProfiles")
      .withIndex("by_username", (q) => q.eq("username", candidate))
      .first();
    if (!clash) return candidate;
    candidate = `${base.slice(0, 25)}.${attempt}`;
  }
  return `editor.${userId.slice(-12)}`;
}

function lastSyncedAt(posts: Doc<"posts">[]): number | null {
  let latest = 0;
  for (const post of posts) {
    if (post.ytSyncedAt && post.ytSyncedAt > latest) latest = post.ytSyncedAt;
  }
  return latest || null;
}

// ---------------------------------------------------------------------------
// Editor-side queries
// ---------------------------------------------------------------------------

/** Lightweight access check used by the community + editor gates. */
export const myEditorStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const editor = await findEditorForUser(ctx, userId);
    if (!editor) return null;
    return {
      editorId: editor._id,
      displayName: editor.displayName,
      status: editor.status ?? "active",
    };
  },
});

/** Navbar helper: does the signed-in account have an active editor profile? */
export const hasEditorProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return false;
    const editor = await findEditorForUser(ctx, userId);
    return Boolean(editor && editor.status !== "disabled");
  },
});

/**
 * The editor's whole world in one live query: profile, settings, assigned
 * videos with their earnings breakdown, payout history and payment requests.
 * Returns null when the account isn't an editor (or is signed out) so the page
 * can show a clear "activate editor access" state instead of an error.
 */
export const myDashboard = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const editor = await findEditorForUser(ctx, userId);
    if (!editor) return null;
    const settings = await getEditorSettings(ctx);
    const allPosts = await ctx.db.query("posts").take(MAX_POSTS);
    const posts = allPosts.filter((post) => post.editorId === editor._id);
    const { payments } = await loadEditorPayments(ctx, editor._id);
    const requests = await loadEditorRequests(ctx, editor._id);
    const { rows, totals } = summarise(posts, payments, requests, settings);
    const titleById = new Map(
      allPosts.map((post) => [post._id as string, post.title]),
    );

    const videos = rows
      .map(({ post, earnings }) => {
        const pending = requests.find(
          (request) =>
            request.postId === post._id && request.status === "pending",
        );
        return {
          _id: post._id,
          title: post.title,
          thumbnail: post.thumbnail ?? null,
          youtubeId: post.youtubeId ?? null,
          youtubeUrl:
            post.youtubeUrl ??
            (post.youtubeId
              ? `https://youtube.com/watch?v=${post.youtubeId}`
              : null),
          published: post.published === true,
          assignedAt:
            post.editorAssignedAt ?? post.publishedAt ?? post.createdAt ?? null,
          syncedAt: post.ytSyncedAt ?? null,
          ...earnings,
          pendingRequestId: pending?._id ?? null,
        };
      })
      .sort((a, b) => (b.assignedAt ?? 0) - (a.assignedAt ?? 0));

    return {
      editor: {
        _id: editor._id,
        displayName: editor.displayName,
        username: editor.username,
        bio: editor.bio ?? null,
        photo: editor.photo ?? null,
        email: editor.email ?? null,
        status: editor.status ?? "active",
      },
      settings,
      youtubeConfigured: youtubeConfigured(),
      lastSyncedAt: lastSyncedAt(posts),
      videos,
      totals,
      payments: payments
        .slice()
        .sort((a, b) => b.paidAt - a.paidAt)
        .map((payment) => ({
          _id: payment._id,
          amount: payment.amount,
          paidAt: payment.paidAt,
          reference: payment.reference ?? null,
          notes: payment.notes ?? null,
          method: payment.method ?? null,
          videoTitle: payment.postId
            ? titleById.get(payment.postId as string) ?? "Video"
            : "General payment",
          postId: payment.postId ?? null,
        })),
      requests: requests.map((request) => ({
        _id: request._id,
        postId: request.postId ?? null,
        amount: request.amount,
        eligibleViews: request.eligibleViews,
        rating: request.rating,
        multiplier: request.multiplier,
        totalEarnings: request.totalEarnings,
        paidSoFar: request.paidSoFar,
        status: request.status,
        note: request.note ?? null,
        adminNote: request.adminNote ?? null,
        // The QR can be up to 450 KB, so it is fetched on demand instead of
        // bloating every dashboard payload.
        hasQr: Boolean(request.qrCode),
        createdAt: request.createdAt ?? null,
        reviewedAt: request.reviewedAt ?? null,
        videoTitle: request.postId
          ? titleById.get(request.postId as string) ?? "Video"
          : "General payout",
      })),
    };
  },
});

// ---------------------------------------------------------------------------
// Editor-side mutations
// ---------------------------------------------------------------------------

/** Links the signed-in account to an editor profile created with its email. */
export const linkMyEditorProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    const existing = await findEditorForUser(ctx, userId);
    if (!existing) {
      throw new Error(
        "Activate editor access from the community page to create your editor profile.",
      );
    }
    if (existing.userId !== userId) {
      await ctx.db.patch(existing._id, { userId, updatedAt: Date.now() });
    }
    return true;
  },
});

/**
 * Creates the caller's editor profile from their existing community
 * membership — the only way an editor profile is created. Joining the
 * community is the recruitment gate; there is no separate application and no
 * admin setup step. Idempotent, so a double click can't create duplicates.
 */
export const becomeEditor = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Sign in or join the community before becoming an editor.");
    }
    const member = await ensureProfile(ctx, userId);
    if (member.status === "disabled") {
      throw new Error(
        "Your community membership is disabled, so editor access can't be activated.",
      );
    }
    const existing = await findEditorForUser(ctx, userId);
    if (existing) {
      if (existing.userId !== userId) {
        await ctx.db.patch(existing._id, { userId, updatedAt: Date.now() });
      }
      return {
        editorId: existing._id,
        created: false,
        status: existing.status ?? "active",
      };
    }
    const email = member.email?.trim().toLowerCase();
    if (!email) {
      throw new Error(
        "Add an email address to your account before becoming an editor.",
      );
    }
    const now = Date.now();
    const username = await uniqueEditorUsername(
      ctx,
      userId,
      member.displayName,
      email,
    );
    const editorId = await ctx.db.insert("editorProfiles", {
      userId,
      email,
      displayName: member.displayName,
      username,
      bio: member.bio?.trim().slice(0, 400) || undefined,
      photo: member.photo,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    return { editorId, created: true, status: "active" };
  },
});

/**
 * Requests a payout for one assigned video. Validates the minimum threshold,
 * the remaining payable balance and duplicate pending requests server-side;
 * the amount typed by the editor can never exceed their unpaid earnings.
 */
export const createPaymentRequest = mutation({
  args: {
    postId: v.id("posts"),
    amount: v.number(),
    qrCode: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const editor = await requireEditor(ctx);
    const post = await ctx.db.get(args.postId);
    if (!post || post.editorId !== editor._id) {
      throw new Error("That video is not assigned to you.");
    }
    if (!isImageDataUrl(args.qrCode)) {
      throw new Error("Upload your eSewa QR code as a PNG, JPG or WebP image.");
    }
    if (dataUrlByteLength(args.qrCode) > QR_MAX_BYTES) {
      throw new Error("QR code image is too large. Please upload a smaller one.");
    }
    const amount = roundMoney(args.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Enter the amount you want to request.");
    }
    const settings = await getEditorSettings(ctx);
    const { byPost } = await loadEditorPayments(ctx, editor._id);
    const earnings = computeVideoEarnings(
      post,
      byPost.get(post._id as string) ?? 0,
      settings,
    );
    if (earnings.eligibleViews <= 0) {
      throw new Error(
        "This video hasn't earned any eligible views yet. Wait for the next YouTube sync.",
      );
    }
    if (earnings.remaining + SOL < settings.minPayout) {
      throw new Error(
        `You can request a payout once at least Rs. ${settings.minPayout} is outstanding on a video.`,
      );
    }
    if (amount > earnings.remaining + SOL) {
      throw new Error(
        `You can request at most Rs. ${earnings.remaining.toFixed(2)} — the unpaid balance on this video.`,
      );
    }
    const existing = await loadEditorRequests(ctx, editor._id);
    if (
      existing.some(
        (request) =>
          request.postId === post._id && request.status === "pending",
      )
    ) {
      throw new Error(
        "You already have a pending payment request for this video.",
      );
    }
    const now = Date.now();
    const id = await ctx.db.insert("paymentRequests", {
      editorId: editor._id,
      postId: post._id,
      amount,
      eligibleViews: earnings.eligibleViews,
      rating: earnings.stars,
      multiplier: earnings.multiplier,
      totalEarnings: earnings.totalEarnings,
      paidSoFar: earnings.paid,
      qrCode: args.qrCode,
      status: "pending",
      note: args.note?.trim().slice(0, 300) || undefined,
      createdAt: now,
    });
    return id;
  },
});

/** Returns the caller's own eSewa QR for one request, on demand. */
export const myPaymentRequestQr = query({
  args: { requestId: v.id("paymentRequests") },
  handler: async (ctx, args) => {
    const editor = await requireEditor(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.editorId !== editor._id) {
      throw new Error("Payment request not found.");
    }
    return request.qrCode ?? null;
  },
});

/** Withdraws one of the caller's own pending requests. */
export const cancelPaymentRequest = mutation({
  args: { requestId: v.id("paymentRequests") },
  handler: async (ctx, args) => {
    const editor = await requireEditor(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.editorId !== editor._id) {
      throw new Error("Payment request not found.");
    }
    if (request.status !== "pending") {
      throw new Error("Only pending requests can be cancelled.");
    }
    await ctx.db.patch(request._id, {
      status: "cancelled",
      reviewedAt: Date.now(),
    });
    return true;
  },
});

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------

/** Compact editor list for assignment dropdowns. */
export const listEditorOptions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const editors = await ctx.db.query("editorProfiles").take(500);
    return editors
      .map((editor) => ({
        _id: editor._id,
        displayName: editor.displayName,
        username: editor.username,
        email: editor.email ?? null,
        status: editor.status ?? "active",
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  },
});

/** All editors with their totals — the admin Editor Management list. */
export const adminListEditors = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const settings = await getEditorSettings(ctx);
    const [editors, posts, payments, requests] = await Promise.all([
      ctx.db.query("editorProfiles").take(500),
      ctx.db.query("posts").take(MAX_POSTS),
      ctx.db.query("editorPayments").take(5000),
      ctx.db.query("paymentRequests").take(2000),
    ]);
    const items = editors
      .map((editor) => {
        const editorPosts = posts.filter(
          (post) => post.editorId === editor._id,
        );
        const editorPayments = payments.filter(
          (payment) => payment.editorId === editor._id,
        );
        const editorRequests = requests.filter(
          (request) => request.editorId === editor._id,
        );
        const { totals } = summarise(
          editorPosts,
          editorPayments,
          editorRequests,
          settings,
        );
        return {
          editor,
          totals,
          lastSyncedAt: lastSyncedAt(editorPosts),
        };
      })
      .sort((a, b) => a.editor.displayName.localeCompare(b.editor.displayName));
    return { items, settings, youtubeConfigured: youtubeConfigured() };
  },
});

/** One editor's profile, videos, payments and requests — admin detail screen. */
export const adminEditorDetail = query({
  args: { editorId: v.id("editorProfiles") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const editor = await ctx.db.get(args.editorId);
    if (!editor) return null;
    const settings = await getEditorSettings(ctx);
    const allPosts = await ctx.db.query("posts").take(MAX_POSTS);
    const posts = allPosts.filter((post) => post.editorId === editor._id);
    const { payments } = await loadEditorPayments(ctx, editor._id);
    const requests = await loadEditorRequests(ctx, editor._id);
    const { rows, totals } = summarise(posts, payments, requests, settings);
    const titleById = new Map(
      allPosts.map((post) => [post._id as string, post.title]),
    );
    return {
      editor,
      settings,
      youtubeConfigured: youtubeConfigured(),
      lastSyncedAt: lastSyncedAt(posts),
      totals,
      videos: rows
        .map(({ post, earnings }) => ({
          post: {
            _id: post._id,
            title: post.title,
            youtubeId: post.youtubeId ?? null,
            youtubeUrl: post.youtubeUrl ?? null,
            thumbnail: post.thumbnail ?? null,
            published: post.published === true,
            assignedAt:
              post.editorAssignedAt ??
              post.publishedAt ??
              post.createdAt ??
              null,
            initialViews: post.editorInitialViews ?? 0,
            ratePerThousand: earnings.ratePerThousand,
            syncedAt: post.ytSyncedAt ?? null,
          },
          earnings,
          payments: payments
            .filter((payment) => payment.postId === post._id)
            .sort((a, b) => b.paidAt - a.paidAt),
          pendingRequest:
            requests.find(
              (request) =>
                request.postId === post._id && request.status === "pending",
            ) ?? null,
        }))
        .sort(
          (a, b) => (b.post.assignedAt ?? 0) - (a.post.assignedAt ?? 0),
        ),
      payments: payments
        .slice()
        .sort((a, b) => b.paidAt - a.paidAt)
        .map((payment) => ({
          ...payment,
          videoTitle: payment.postId
            ? titleById.get(payment.postId as string) ?? "Video"
            : "General payment",
        })),
      requests: requests.map((request) => ({
        ...request,
        qrCode: undefined,
        hasQr: Boolean(request.qrCode),
        videoTitle: request.postId
          ? titleById.get(request.postId as string) ?? "Video"
          : "General payout",
      })),
    };
  },
});

/** Fetches one request's eSewa QR image on demand (keeps lists lightweight). */
export const adminGetPaymentRequestQr = query({
  args: { requestId: v.id("paymentRequests") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const request = await ctx.db.get(args.requestId);
    return request?.qrCode ?? null;
  },
});

/** Pending requests across every editor, for the admin payout queue. */
export const adminListPaymentRequests = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const [requests, editors, posts] = await Promise.all([
      args.status
        ? ctx.db
            .query("paymentRequests")
            .withIndex("by_status", (q) => q.eq("status", args.status!))
            .order("desc")
            .take(300)
        : ctx.db.query("paymentRequests").order("desc").take(300),
      ctx.db.query("editorProfiles").take(500),
      ctx.db.query("posts").take(MAX_POSTS),
    ]);
    const editorById = new Map(
      editors.map((editor) => [editor._id as string, editor]),
    );
    const titleById = new Map(
      posts.map((post) => [post._id as string, post.title]),
    );
    return requests.map((request) => {
      const editor = editorById.get(request.editorId as string);
      return {
        ...request,
        qrCode: undefined,
        hasQr: Boolean(request.qrCode),
        editorName: editor?.displayName ?? "Unknown editor",
        editorUsername: editor?.username ?? "",
        videoTitle: request.postId
          ? titleById.get(request.postId as string) ?? "Video"
          : "General payout",
      };
    });
  },
});

/** Badge count for the admin sidebar. */
export const adminPendingRequestCount = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return 0;
    const pending = await ctx.db
      .query("paymentRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(300);
    return pending.length;
  },
});

/** Everything the earnings panel for one video needs. */
export const adminVideoSummary = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const post = await ctx.db.get(args.postId);
    if (!post) return null;
    const settings = await getEditorSettings(ctx);
    const payments = post.editorId
      ? (await loadEditorPayments(ctx, post.editorId)).payments.filter(
          (payment) => payment.postId === post._id,
        )
      : [];
    const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const earnings = computeVideoEarnings(post, paid, settings);
    const editor = post.editorId
      ? await ctx.db.get(post.editorId)
      : null;
    const requests = post.editorId
      ? (await loadEditorRequests(ctx, post.editorId)).filter(
          (request) => request.postId === post._id,
        )
      : [];
    return {
      post: {
        _id: post._id,
        title: post.title,
        editorId: post.editorId ?? null,
        assignedAt: post.editorAssignedAt ?? null,
        initialViews: post.editorInitialViews ?? 0,
        ratePerThousand: post.editorRateSnapshot ?? settings.ratePerThousand,
        ytViews: post.ytViews ?? 0,
        ytLikes: post.ytLikes ?? 0,
        syncedAt: post.ytSyncedAt ?? null,
      },
      editor: editor
        ? {
            _id: editor._id,
            displayName: editor.displayName,
            username: editor.username,
            email: editor.email ?? null,
          }
        : null,
      settings,
      earnings,
      payments: payments.slice().sort((a, b) => b.paidAt - a.paidAt),
      requests: requests.map((request) => ({
        ...request,
        qrCode: undefined,
        hasQr: Boolean(request.qrCode),
      })),
      youtubeConfigured: youtubeConfigured(),
    };
  },
});

// ---------------------------------------------------------------------------
// Admin mutations — editors
// ---------------------------------------------------------------------------

function validatePhoto(photo: string | undefined): string | undefined {
  if (photo === undefined) return undefined;
  if (photo === "") return undefined;
  if (!isImageDataUrl(photo)) {
    throw new Error("Profile photo must be a PNG, JPG or WebP image.");
  }
  if (dataUrlByteLength(photo) > PHOTO_MAX_BYTES) {
    throw new Error("Profile photo is too large. Maximum size is 400 KB.");
  }
  return photo;
}

function normaliseUsername(input: string): string {
  const username = input.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    throw new Error(
      "Username must be 3–30 characters using lowercase letters, numbers, dots, dashes or underscores.",
    );
  }
  return username;
}

function normaliseEmail(input: string | undefined): string | undefined {
  const email = input?.trim().toLowerCase();
  if (!email) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  return email;
}

async function linkUserByEmail(
  ctx: MutationCtx,
  email: string | undefined,
): Promise<Id<"users"> | undefined> {
  if (!email) return undefined;
  const user = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .first();
  return user?._id;
}

export const adminUpdateEditor = mutation({
  args: {
    editorId: v.id("editorProfiles"),
    patch: v.object({
      displayName: v.optional(v.string()),
      username: v.optional(v.string()),
      email: v.optional(v.string()),
      bio: v.optional(v.string()),
      photo: v.optional(v.string()),
      status: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const editor = await ctx.db.get(args.editorId);
    if (!editor) throw new Error("Editor not found.");
    const patch: Partial<Doc<"editorProfiles">> = { updatedAt: Date.now() };
    if (args.patch.displayName !== undefined) {
      const displayName = args.patch.displayName.trim().slice(0, 60);
      if (displayName.length < 2) {
        throw new Error("Display name must be at least 2 characters.");
      }
      patch.displayName = displayName;
    }
    if (args.patch.username !== undefined) {
      const username = normaliseUsername(args.patch.username);
      if (username !== editor.username) {
        const clash = await ctx.db
          .query("editorProfiles")
          .withIndex("by_username", (q) => q.eq("username", username))
          .first();
        if (clash && clash._id !== editor._id) {
          throw new Error("That username is already taken.");
        }
      }
      patch.username = username;
    }
    if (args.patch.email !== undefined) {
      const email = normaliseEmail(args.patch.email);
      patch.email = email;
      // The email identifies the account, so relink (or unlink) whenever it
      // changes — otherwise a replaced editor would keep access.
      patch.userId = await linkUserByEmail(ctx, email);
    }
    if (args.patch.bio !== undefined) {
      patch.bio = args.patch.bio.trim().slice(0, 400) || undefined;
    }
    if (args.patch.photo !== undefined) {
      patch.photo = validatePhoto(args.patch.photo);
    }
    if (args.patch.status !== undefined) {
      if (args.patch.status !== "active" && args.patch.status !== "disabled") {
        throw new Error("Invalid editor status.");
      }
      patch.status = args.patch.status;
    }
    await ctx.db.patch(editor._id, patch);
    return true;
  },
});

/** Saves the programme-wide settings without touching website code. */
export const adminUpdateEditorSettings = mutation({
  args: {
    whatsappNumber: v.string(),
    ratePerThousand: v.number(),
    minPayout: v.number(),
    thresholds: v.array(v.number()),
    multipliers: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const whatsappNumber = normaliseWhatsappNumber(args.whatsappNumber);
    if (whatsappNumber && !/^\+?\d{7,15}$/.test(whatsappNumber)) {
      throw new Error(
        "Enter a valid WhatsApp number with country code (7–15 digits).",
      );
    }
    if (!Number.isFinite(args.ratePerThousand) || args.ratePerThousand < 0) {
      throw new Error("The rate per 1,000 views must be zero or more.");
    }
    if (!Number.isFinite(args.minPayout) || args.minPayout < 0) {
      throw new Error("The minimum payout must be zero or more.");
    }
    if (
      args.thresholds.length !== 4 ||
      args.thresholds.some((n) => !Number.isFinite(n) || n < 0)
    ) {
      throw new Error("Enter exactly 4 rating thresholds (percentages).");
    }
    for (let i = 1; i < args.thresholds.length; i++) {
      if (args.thresholds[i] <= args.thresholds[i - 1]) {
        throw new Error("Rating thresholds must be in ascending order.");
      }
    }
    if (
      args.multipliers.length !== 5 ||
      args.multipliers.some((n) => !Number.isFinite(n) || n <= 0)
    ) {
      throw new Error("Enter exactly 5 earning multipliers greater than zero.");
    }
    const patch = {
      whatsappNumber,
      editorRatePerThousand: args.ratePerThousand,
      editorMinPayout: args.minPayout,
      editorRatingThresholds: JSON.stringify(args.thresholds),
      editorRatingMultipliers: JSON.stringify(args.multipliers),
    };
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

/**
 * Assigns (or unassigns) a video. Assignment snapshots the current view count
 * and the effective rate so views from before the editor joined never earn and
 * later rate changes never rewrite history.
 */
export const assignVideoToEditor = mutation({
  args: {
    postId: v.id("posts"),
    editorId: v.union(v.id("editorProfiles"), v.null()),
    assignedAt: v.optional(v.number()),
    initialViews: v.optional(v.number()),
    ratePerThousand: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Video not found.");
    if (args.editorId === null) {
      const hadAssignment = Boolean(post.editorId);
      await ctx.db.patch(post._id, {
        editorId: undefined,
        editorAssignedAt: undefined,
        editorInitialViews: undefined,
        editorRateSnapshot: undefined,
      });
      return { assigned: false as const, changed: hadAssignment };
    }
    const editor = await ctx.db.get(args.editorId);
    if (!editor) throw new Error("Editor not found.");
    if (editor.status === "disabled") {
      throw new Error("That editor is disabled — re-enable them first.");
    }
    const settings = await getEditorSettings(ctx);
    const isNewAssignment = post.editorId !== args.editorId;
    if (args.assignedAt !== undefined && !Number.isFinite(args.assignedAt)) {
      throw new Error("Invalid assignment date.");
    }
    const assignedAt =
      args.assignedAt ??
      (isNewAssignment
        ? Date.now()
        : post.editorAssignedAt ?? Date.now());
    const initialViews =
      args.initialViews !== undefined
        ? roundViews(args.initialViews)
        : isNewAssignment
          ? roundViews(post.ytViews ?? 0)
          : roundViews(post.editorInitialViews ?? 0);
    const rate =
      args.ratePerThousand !== undefined && Number.isFinite(args.ratePerThousand)
        ? Math.max(0, args.ratePerThousand)
        : isNewAssignment
          ? settings.ratePerThousand
          : post.editorRateSnapshot ?? settings.ratePerThousand;
    await ctx.db.patch(post._id, {
      editorId: editor._id,
      editorAssignedAt: assignedAt,
      editorInitialViews: initialViews,
      editorRateSnapshot: rate,
      updatedAt: Date.now(),
    });
    return { assigned: true as const, changed: isNewAssignment };
  },
});

// ---------------------------------------------------------------------------
// Admin mutations — payments & requests
// ---------------------------------------------------------------------------

export const adminRecordPayment = mutation({
  args: {
    editorId: v.id("editorProfiles"),
    postId: v.optional(v.id("posts")),
    amount: v.number(),
    paidAt: v.optional(v.number()),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
    method: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const editor = await ctx.db.get(args.editorId);
    if (!editor) throw new Error("Editor not found.");
    const amount = roundMoney(args.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }
    const settings = await getEditorSettings(ctx);
    const { payments, total } = await loadEditorPayments(ctx, editor._id);
    const allPosts = await ctx.db.query("posts").take(MAX_POSTS);
    const editorPosts = allPosts.filter(
      (post) => post.editorId === editor._id,
    );
    if (args.postId) {
      const post = editorPosts.find((entry) => entry._id === args.postId);
      if (!post) throw new Error("That video is not assigned to this editor.");
      const paidForPost = payments
        .filter((payment) => payment.postId === post._id)
        .reduce((sum, payment) => sum + payment.amount, 0);
      const earnings = computeVideoEarnings(post, paidForPost, settings);
      if (amount > earnings.remaining + SOL) {
        throw new Error(
          `That is more than the Rs. ${earnings.remaining.toFixed(2)} still payable on this video.`,
        );
      }
    } else {
      const totalEarned = roundMoney(
        summarise(editorPosts, payments, [], settings).totals.totalEarned,
      );
      if (amount > totalEarned - total + SOL) {
        throw new Error(
          `That is more than the Rs. ${Math.max(0, totalEarned - total).toFixed(2)} outstanding for this editor.`,
        );
      }
    }
    const now = Date.now();
    const id = await ctx.db.insert("editorPayments", {
      editorId: editor._id,
      postId: args.postId,
      amount,
      paidAt: args.paidAt && Number.isFinite(args.paidAt) ? args.paidAt : now,
      reference: args.reference?.trim().slice(0, 120) || undefined,
      notes: args.notes?.trim().slice(0, 400) || undefined,
      method: args.method?.trim().slice(0, 30) || undefined,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const adminUpdatePayment = mutation({
  args: {
    paymentId: v.id("editorPayments"),
    patch: v.object({
      amount: v.optional(v.number()),
      paidAt: v.optional(v.number()),
      reference: v.optional(v.string()),
      notes: v.optional(v.string()),
      method: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment record not found.");
    const amount =
      args.patch.amount !== undefined
        ? roundMoney(args.patch.amount)
        : payment.amount;
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }
    if (amount !== payment.amount) {
      const settings = await getEditorSettings(ctx);
      const { payments } = await loadEditorPayments(ctx, payment.editorId);
      if (payment.postId) {
        const otherPaid = payments
          .filter(
            (entry) =>
              entry._id !== payment._id && entry.postId === payment.postId,
          )
          .reduce((sum, entry) => sum + entry.amount, 0);
        const post = await ctx.db.get(payment.postId);
        if (!post) throw new Error("The linked video no longer exists.");
        const earnings = computeVideoEarnings(post, otherPaid, settings);
        if (amount > earnings.remaining + SOL) {
          throw new Error(
            `That is more than the Rs. ${earnings.remaining.toFixed(2)} still payable on this video.`,
          );
        }
      } else {
        const otherPaid = payments
          .filter((entry) => entry._id !== payment._id)
          .reduce((sum, entry) => sum + entry.amount, 0);
        const allPosts = await ctx.db.query("posts").take(MAX_POSTS);
        const editorPosts = allPosts.filter(
          (post) => post.editorId === payment.editorId,
        );
        const totals = summarise(editorPosts, payments, [], settings).totals;
        if (amount > totals.totalEarned - otherPaid + SOL) {
          throw new Error("That is more than this editor's outstanding balance.");
        }
      }
    }
    const patch: Partial<Doc<"editorPayments">> = {
      amount,
      updatedAt: Date.now(),
    };
    if (args.patch.paidAt !== undefined) {
      if (!Number.isFinite(args.patch.paidAt)) {
        throw new Error("Invalid payment date.");
      }
      patch.paidAt = args.patch.paidAt;
    }
    if (args.patch.reference !== undefined) {
      patch.reference = args.patch.reference.trim().slice(0, 120) || undefined;
    }
    if (args.patch.notes !== undefined) {
      patch.notes = args.patch.notes.trim().slice(0, 400) || undefined;
    }
    if (args.patch.method !== undefined) {
      patch.method = args.patch.method.trim().slice(0, 30) || undefined;
    }
    await ctx.db.patch(payment._id, patch);
    return true;
  },
});

/** Removes a payment record. A request it settled is reopened for review. */
export const adminDeletePayment = mutation({
  args: { paymentId: v.id("editorPayments") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment record not found.");
    await ctx.db.delete(payment._id);
    if (payment.requestId) {
      const request = await ctx.db.get(payment.requestId);
      if (request) {
        await ctx.db.patch(request._id, {
          status: "pending",
          paymentId: undefined,
          reviewedAt: undefined,
          adminNote: "Payment record was removed — please review again.",
        });
      }
    }
    return true;
  },
});

/**
 * Reviews a payout request. Approving it ("paid") creates a real payment
 * record after re-checking the outstanding balance, so an admin can never
 * accidentally overpay through the review screen.
 */
export const adminReviewPaymentRequest = mutation({
  args: {
    requestId: v.id("paymentRequests"),
    status: v.union(
      v.literal("paid"),
      v.literal("rejected"),
      v.literal("pending"),
    ),
    amountPaid: v.optional(v.number()),
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminId = await requireAdmin(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Payment request not found.");
    const now = Date.now();
    const adminNote = args.adminNote?.trim().slice(0, 400) || undefined;

    if (args.status === "pending") {
      if (request.status === "paid") {
        throw new Error(
          "This request is already paid — remove the payment record first.",
        );
      }
      await ctx.db.patch(request._id, {
        status: "pending",
        reviewedAt: undefined,
        reviewedBy: undefined,
        adminNote,
      });
      return { status: "pending" as const };
    }

    if (args.status === "rejected") {
      if (request.status === "paid") {
        throw new Error("A paid request cannot be rejected.");
      }
      await ctx.db.patch(request._id, {
        status: "rejected",
        reviewedAt: now,
        reviewedBy: adminId,
        adminNote,
      });
      return { status: "rejected" as const };
    }

    if (request.status === "paid") {
      throw new Error("This request has already been paid.");
    }
    if (!request.postId) {
      throw new Error("This request is not linked to a video.");
    }
    const post = await ctx.db.get(request.postId);
    if (!post || post.editorId !== request.editorId) {
      throw new Error(
        "The video is no longer assigned to this editor — reject the request or reassign the video.",
      );
    }
    const settings = await getEditorSettings(ctx);
    const { payments } = await loadEditorPayments(ctx, request.editorId);
    const paidForPost = payments
      .filter((payment) => payment.postId === post._id)
      .reduce((sum, payment) => sum + payment.amount, 0);
    const earnings = computeVideoEarnings(post, paidForPost, settings);
    const amount = roundMoney(
      args.amountPaid !== undefined ? args.amountPaid : request.amount,
    );
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }
    if (amount > earnings.remaining + SOL) {
      throw new Error(
        `Only Rs. ${earnings.remaining.toFixed(2)} is still payable on this video.`,
      );
    }
    const paymentId = await ctx.db.insert("editorPayments", {
      editorId: request.editorId,
      postId: post._id,
      amount,
      paidAt: now,
      reference: `REQ-${(request._id as string).slice(-6).toUpperCase()}`,
      notes: adminNote ?? "Payment request settled",
      method: "esewa",
      requestId: request._id,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(request._id, {
      status: "paid",
      amount,
      reviewedAt: now,
      reviewedBy: adminId,
      adminNote,
      paymentId,
    });
    return { status: "paid" as const, paymentId };
  },
});
