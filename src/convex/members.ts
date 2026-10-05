// ---------------------------------------------------------------------------
// Community membership: profiles, member ↔ creator messaging, notifications,
// saved content and creator updates.
//
// Security model:
//   * Every "my…" function resolves the caller with getAuthUserId and only
//     ever reads/writes documents keyed to that user — a member can never see
//     another member's messages, profile or notifications.
//   * Every "admin…" function goes through requireAdmin (owner only).
// ---------------------------------------------------------------------------

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { isAdmin, requireAdmin } from "./lib";

const MAX_MESSAGES = 500;
const MAX_UPDATES = 200;
const BODY_MAX = 2000;
const PHOTO_MAX_BYTES = 400 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

// ---- helpers ----

async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Unauthorized");
  return userId;
}

async function getProfileByUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("memberProfiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
}

/**
 * Creates the community profile on first touch (signup + first visit to the
 * member area). Idempotent, so it is safe to call from several places.
 */
async function ensureProfile(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<Doc<"memberProfiles">> {
  const existing = await getProfileByUser(ctx, userId);
  if (existing) return existing;
  const user = (await ctx.db.get(userId)) as {
    email?: string;
    name?: string;
  } | null;
  const email = user?.email?.trim() ?? "";
  const fromEmail = email ? email.split("@")[0] : "";
  const displayName = (user?.name?.trim() || fromEmail || "Member").slice(0, 48);
  const id = await ctx.db.insert("memberProfiles", {
    userId,
    displayName,
    email,
    status: "active",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Could not create your community profile.");
  return created;
}

function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return 0;
  return Math.floor(((dataUrl.length - comma - 1) * 3) / 4);
}

// ---------------------------------------------------------------------------
// Member-side queries
// ---------------------------------------------------------------------------

/** The caller's own community profile (null until first ensured). */
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await getProfileByUser(ctx, userId);
  },
});

/** The caller's own conversation with the creator (asc, live). */
export const listMyMessages = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("memberMessages")
      .withIndex("by_member", (q) => q.eq("memberId", userId))
      .order("asc")
      .take(MAX_MESSAGES);
  },
});

/** Unread replies from the creator, for the member nav badge. */
export const countUnreadMessages = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return 0;
    const messages = await ctx.db
      .query("memberMessages")
      .withIndex("by_member_read", (q) =>
        q.eq("memberId", userId).eq("read", false),
      )
      .take(MAX_MESSAGES);
    return messages.filter((m) => m.sender === "admin").length;
  },
});

export const listMyNotifications = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("memberNotifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
    return rows;
  },
});

export const countUnreadNotifications = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return 0;
    const rows = await ctx.db
      .query("memberNotifications")
      .withIndex("by_user_read", (q) => q.eq("userId", userId).eq("read", false))
      .take(500);
    return rows.length;
  },
});

export const listSavedContent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("savedContent")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);
  },
});

/** Creator updates / announcements — any signed-in member can read these. */
export const listCreatorUpdates = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("creatorUpdates")
      .withIndex("by_created")
      .order("desc")
      .take(30);
  },
});

// ---------------------------------------------------------------------------
// Member-side mutations
// ---------------------------------------------------------------------------

/** Idempotent profile creation — called on first entry to the member area. */
export const ensureMyProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ensureProfile(ctx, userId);
  },
});

/** Update my own display name / bio / photo. Nobody else's. */
export const updateMyProfile = mutation({
  args: {
    displayName: v.string(),
    bio: v.optional(v.string()),
    photo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const profile = await ensureProfile(ctx, userId);
    if (profile.status === "disabled") {
      throw new Error("Your community account has been disabled.");
    }
    const displayName = args.displayName.trim().slice(0, 48);
    if (displayName.length < 2) {
      throw new Error("Display name must be at least 2 characters.");
    }
    const bio = (args.bio ?? "").trim().slice(0, 240);
    const patch: Partial<Doc<"memberProfiles">> = {
      displayName,
      bio,
      updatedAt: Date.now(),
    };
    if (args.photo !== undefined) {
      if (args.photo === "") {
        patch.photo = undefined;
      } else {
        const match = args.photo.match(/^data:(image\/[a-z+]+);base64,/);
        if (
          !match ||
          !(ALLOWED_IMAGE_TYPES as readonly string[]).includes(match[1])
        ) {
          throw new Error("Unsupported image type. Use JPG, PNG or WebP.");
        }
        if (dataUrlByteLength(args.photo) > PHOTO_MAX_BYTES) {
          throw new Error("Profile photo is too large. Maximum size is 400 KB.");
        }
        patch.photo = args.photo;
      }
    }
    await ctx.db.patch(profile._id, patch);
    return true;
  },
});

/** Send a message to the creator/admin. */
export const sendMessage = mutation({
  args: { body: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const profile = await ensureProfile(ctx, userId);
    if (profile.status === "disabled") {
      throw new Error("Your community account has been disabled.");
    }
    const body = args.body.trim().slice(0, BODY_MAX);
    if (!body) throw new Error("Message cannot be empty.");
    await ctx.db.insert("memberMessages", {
      memberId: userId,
      sender: "member",
      senderName: profile.displayName,
      body,
      read: false,
      createdAt: Date.now(),
    });
    return true;
  },
});

/** Member opened the conversation — mark the creator's replies as read. */
export const markMessagesRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const unread = await ctx.db
      .query("memberMessages")
      .withIndex("by_member_read", (q) =>
        q.eq("memberId", userId).eq("read", false),
      )
      .take(MAX_MESSAGES);
    let count = 0;
    for (const message of unread) {
      if (message.sender === "admin") {
        await ctx.db.patch(message._id, { read: true });
        count += 1;
      }
    }
    return count;
  },
});

export const markNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const unread = await ctx.db
      .query("memberNotifications")
      .withIndex("by_user_read", (q) => q.eq("userId", userId).eq("read", false))
      .take(500);
    for (const notification of unread) {
      await ctx.db.patch(notification._id, { read: true });
    }
    return unread.length;
  },
});

/** Mark a single notification as read — only if it belongs to the caller. */
export const markNotificationRead = mutation({
  args: { id: v.id("memberNotifications") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const notification = await ctx.db.get(args.id);
    if (!notification || notification.userId !== userId) {
      throw new Error("Unauthorized");
    }
    if (notification.read !== true) {
      await ctx.db.patch(args.id, { read: true });
    }
    return true;
  },
});

/** Save / unsave a content item for the caller. */
export const toggleSavedContent = mutation({
  args: {
    contentId: v.string(),
    kind: v.string(),
    title: v.string(),
    subtitle: v.optional(v.string()),
    href: v.string(),
    thumbnail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const profile = await ensureProfile(ctx, userId);
    if (profile.status === "disabled") {
      throw new Error("Your community account has been disabled.");
    }
    const existing = await ctx.db
      .query("savedContent")
      .withIndex("by_user_content", (q) =>
        q.eq("userId", userId).eq("contentId", args.contentId),
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false };
    }
    await ctx.db.insert("savedContent", {
      userId,
      contentId: args.contentId,
      kind: args.kind,
      title: args.title.slice(0, 200),
      subtitle: args.subtitle?.slice(0, 200),
      href: args.href,
      thumbnail: args.thumbnail,
      createdAt: Date.now(),
    });
    return { saved: true };
  },
});

// ---------------------------------------------------------------------------
// Admin functions (owner only)
// ---------------------------------------------------------------------------

interface MemberRow {
  profile: Doc<"memberProfiles">;
  unread: number;
  lastMessage?: Doc<"memberMessages">;
}

async function loadMemberRows(ctx: QueryCtx | MutationCtx) {
  const profiles = await ctx.db.query("memberProfiles").take(500);
  const messages = await ctx.db.query("memberMessages").take(2000);
  const rows: MemberRow[] = profiles.map((profile) => ({
    profile,
    unread: 0,
    lastMessage: undefined,
  }));
  const byUser = new Map<string, MemberRow>(
    rows.map((row) => [row.profile.userId as string, row]),
  );
  for (const message of messages) {
    const row = byUser.get(message.memberId as string);
    if (!row) continue;
    if (message.sender === "member" && message.read !== true) {
      row.unread += 1;
    }
    if (
      !row.lastMessage ||
      (message.createdAt ?? 0) > (row.lastMessage.createdAt ?? 0)
    ) {
      row.lastMessage = message;
    }
  }
  return rows;
}

/** Members list (search + pagination) for the admin studio. */
export const adminListMembers = query({
  args: {
    search: v.optional(v.string()),
    page: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    let rows = await loadMemberRows(ctx);
    const term = args.search?.trim().toLowerCase();
    if (term) {
      rows = rows.filter(
        (row) =>
          row.profile.displayName.toLowerCase().includes(term) ||
          (row.profile.email ?? "").toLowerCase().includes(term) ||
          (row.profile.bio ?? "").toLowerCase().includes(term),
      );
    }
    rows.sort(
      (a, b) =>
        (b.lastMessage?.createdAt ?? b.profile.createdAt ?? 0) -
        (a.lastMessage?.createdAt ?? a.profile.createdAt ?? 0),
    );
    const total = rows.length;
    const start = ((args.page ?? 1) - 1) * 20;
    const items = start >= total ? [] : rows.slice(start, start + 20);
    return { items, total };
  },
});

/** Unread member→admin messages across all threads (admin nav badge). */
export const adminUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return 0;
    const messages = await ctx.db.query("memberMessages").take(2000);
    return messages.filter((m) => m.sender === "member" && m.read !== true)
      .length;
  },
});

/** Full conversation between the admin and one member. */
export const adminListThread = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const [profile, messages] = await Promise.all([
      getProfileByUser(ctx, args.userId),
      ctx.db
        .query("memberMessages")
        .withIndex("by_member", (q) => q.eq("memberId", args.userId))
        .order("asc")
        .take(MAX_MESSAGES),
    ]);
    return { profile, messages };
  },
});

/** Admin reply inside a member's thread. */
export const adminReply = mutation({
  args: { userId: v.id("users"), body: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const profile = await getProfileByUser(ctx, args.userId);
    if (!profile) throw new Error("Member not found.");
    const body = args.body.trim().slice(0, BODY_MAX);
    if (!body) throw new Error("Message cannot be empty.");
    const settings = await ctx.db.query("siteSettings").first();
    await ctx.db.insert("memberMessages", {
      memberId: args.userId,
      sender: "admin",
      senderName: settings?.creatorName || settings?.title || "Creator",
      body,
      read: false,
      createdAt: Date.now(),
    });
    await ctx.db.insert("memberNotifications", {
      userId: args.userId,
      type: "message",
      title: "New reply from the creator",
      body: body.slice(0, 140),
      link: "/member/messages",
      read: false,
      createdAt: Date.now(),
    });
    return true;
  },
});

/** Mark the member's side of a thread as read by the admin. */
export const adminMarkThreadRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const unread = await ctx.db
      .query("memberMessages")
      .withIndex("by_member_read", (q) =>
        q.eq("memberId", args.userId).eq("read", false),
      )
      .take(MAX_MESSAGES);
    let count = 0;
    for (const message of unread) {
      if (message.sender === "member") {
        await ctx.db.patch(message._id, { read: true });
        count += 1;
      }
    }
    return count;
  },
});

/** Remove one message (inappropriate content). */
export const adminDeleteMessage = mutation({
  args: { id: v.id("memberMessages") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const message = await ctx.db.get(args.id);
    if (!message) throw new Error("Message not found.");
    await ctx.db.delete(args.id);
    return true;
  },
});

/** Disable or re-enable a community account. */
export const adminSetMemberStatus = mutation({
  args: { userId: v.id("users"), status: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.status !== "active" && args.status !== "disabled") {
      throw new Error("Invalid status.");
    }
    const profile = await getProfileByUser(ctx, args.userId);
    if (!profile) throw new Error("Member not found.");
    await ctx.db.patch(profile._id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return true;
  },
});

/** Remove a community account and all of its private data. */
export const adminDeleteMember = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const profile = await getProfileByUser(ctx, args.userId);
    if (!profile) throw new Error("Member not found.");
    const messages = await ctx.db
      .query("memberMessages")
      .withIndex("by_member", (q) => q.eq("memberId", args.userId))
      .take(MAX_MESSAGES);
    for (const message of messages) await ctx.db.delete(message._id);
    const notifications = await ctx.db
      .query("memberNotifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(500);
    for (const notification of notifications)
      await ctx.db.delete(notification._id);
    const saved = await ctx.db
      .query("savedContent")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(500);
    for (const item of saved) await ctx.db.delete(item._id);
    await ctx.db.delete(profile._id);
    return true;
  },
});

// ---- creator updates / announcements ----

export const adminListUpdates = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("creatorUpdates")
      .withIndex("by_created")
      .order("desc")
      .take(MAX_UPDATES);
  },
});

/** Publish a creator update and notify every community member. */
export const adminCreateUpdate = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    kind: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const title = args.title.trim().slice(0, 120);
    const body = args.body.trim().slice(0, 2000);
    if (!title || !body) throw new Error("Title and body are required.");
    const kind = args.kind === "announcement" ? "announcement" : "update";
    const now = Date.now();
    await ctx.db.insert("creatorUpdates", { title, body, kind, createdAt: now });
    const members = await ctx.db.query("memberProfiles").take(500);
    for (const member of members) {
      if (member.status === "disabled") continue;
      await ctx.db.insert("memberNotifications", {
        userId: member.userId,
        type: kind,
        title,
        body: body.slice(0, 140),
        link: "/member/updates",
        read: false,
        createdAt: now,
      });
    }
    return true;
  },
});

export const adminDeleteUpdate = mutation({
  args: { id: v.id("creatorUpdates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const update = await ctx.db.get(args.id);
    if (!update) throw new Error("Update not found.");
    await ctx.db.delete(args.id);
    return true;
  },
});
