// ---------------------------------------------------------------------------
// YouTube Data API sync for editor-assigned videos.
//
// Views and likes are never invented: without a YOUTUBE_API_KEY the queries
// report `youtubeConfigured: false` and the UI explains how to configure it.
// The hourly cron keeps statistics fresh; the admin can also sync on demand
// from the studio.
// ---------------------------------------------------------------------------

import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";

const MAX_POSTS = 1000;
const BATCH_SIZE = 50; // YouTube Data API limit per videos.list request
const MAX_SYNC_PAGES = 10;

interface SyncTarget {
  postId: string;
  youtubeId: string;
}

export const listSyncTargets = internalQuery({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").take(MAX_POSTS);
    const targets = posts
      .filter((post) => post.editorId && post.youtubeId)
      .map((post) => ({
        postId: post._id as string,
        youtubeId: post.youtubeId as string,
      }));
    return targets.slice(0, BATCH_SIZE * MAX_SYNC_PAGES);
  },
});

export const applyStats = internalMutation({
  args: {
    stats: v.array(
      v.object({
        postId: v.id("posts"),
        views: v.number(),
        likes: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let updated = 0;
    for (const stat of args.stats) {
      const post = await ctx.db.get(stat.postId);
      if (!post) continue;
      await ctx.db.patch(post._id, {
        ytViews: Math.max(0, Math.floor(stat.views)),
        ytLikes: Math.max(0, Math.floor(stat.likes)),
        ytSyncedAt: now,
      });
      updated += 1;
    }
    return { updated, syncedAt: now };
  },
});

async function fetchStats(
  targets: SyncTarget[],
  apiKey: string,
): Promise<Array<{ postId: string; views: number; likes: number; found: boolean }>> {
  const byYoutubeId = new Map(targets.map((target) => [target.youtubeId, target]));
  const results: Array<{ postId: string; views: number; likes: number; found: boolean }> = [];
  for (let start = 0; start < targets.length; start += BATCH_SIZE) {
    const batch = targets.slice(start, start + BATCH_SIZE);
    const ids = batch.map((target) => target.youtubeId).join(",");
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(ids)}&key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `YouTube Data API returned ${response.status}. ${body.slice(0, 180)}`.trim(),
      );
    }
    const payload = (await response.json()) as {
      items?: Array<{
        id?: string;
        statistics?: { viewCount?: string; likeCount?: string };
      }>;
    };
    for (const item of payload.items ?? []) {
      const target = item.id ? byYoutubeId.get(item.id) : undefined;
      if (!target) continue;
      const views = Number(item.statistics?.viewCount ?? 0);
      const likes = Number(item.statistics?.likeCount ?? 0);
      results.push({
        postId: target.postId,
        views: Number.isFinite(views) ? Math.max(0, views) : 0,
        likes: Number.isFinite(likes) ? Math.max(0, likes) : 0,
        found: true,
      });
    }
  }
  return results;
}

interface SyncResult {
  configured: boolean;
  videos: number;
  updated: number;
  syncedAt: number | null;
}

async function runSync(
  ctx: ActionCtx,
  requireAdminCaller: boolean,
): Promise<SyncResult> {
  if (requireAdminCaller) {
    const admin = await ctx.runQuery(api.site.isAdmin, {});
    if (!admin) throw new Error("Unauthorized");
  }
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    if (requireAdminCaller) {
      throw new Error(
        "YouTube sync is not configured. Add a YOUTUBE_API_KEY environment variable in Convex (YouTube Data API v3 enabled) and try again.",
      );
    }
    return { configured: false, videos: 0, updated: 0, syncedAt: null };
  }
  const targets: SyncTarget[] = await ctx.runQuery(
    internal.youtube.listSyncTargets,
    {},
  );
  if (targets.length === 0) {
    return { configured: true, videos: 0, updated: 0, syncedAt: Date.now() };
  }
  const stats = await fetchStats(targets, apiKey);
  const result: { updated: number; syncedAt: number } = await ctx.runMutation(
    internal.youtube.applyStats,
    {
      stats: stats.map((stat) => ({
        postId: stat.postId as never,
        views: stat.views,
        likes: stat.likes,
      })),
    },
  );
  return {
    configured: true,
    videos: targets.length,
    updated: result.updated,
    syncedAt: result.syncedAt,
  };
}

/** Admin-triggered sync (also usable from the editor dashboard). */
export const syncYoutubeStats = action({
  args: {},
  handler: async (ctx): Promise<SyncResult> => {
    return await runSync(ctx, true);
  },
});

/** Hourly cron entry point — silently skips when no API key is configured. */
export const syncAll = internalAction({
  args: {},
  handler: async (ctx): Promise<SyncResult> => {
    return await runSync(ctx, false);
  },
});
