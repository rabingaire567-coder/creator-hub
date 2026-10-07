import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { isAdmin, requireAdmin, safeGet } from "./lib";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import type { GenericDatabaseReader } from "convex/server";

/**
 * 📄 PDF Library — a standalone content type, fully separate from articles,
 * videos, projects and resources.
 *
 * Upload flow: the admin asks `generateUploadUrl`, POSTs the raw file to that
 * short-lived URL (browser → Convex storage directly), then saves the row with
 * the returned storage id. `ctx.storage.store()` is action-only, and pushing
 * bytes through mutation arguments would hit the 16 MiB cap anyway.
 *
 * - PDF bytes live in Convex file storage (documents are capped at 1 MiB).
 * - The thumbnail is a compressed data URL, matching the site-wide pattern.
 * - File URLs are only issued AFTER the visibility check, so a members-only
 *   PDF never leaks a link to signed-out visitors.
 */

const MAX_DOCS = 300;
/** Product cap — enforced server-side from the stored file's metadata. */
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
/** Thumbnails must stay well under the 1 MiB document limit (JSON-encoded). */
const MAX_THUMBNAIL_CHARS = 600_000;

/** Minimal structural views of Convex's storage interfaces. */
type StorageUrlReader = {
  getUrl: (id: Id<"_storage">) => Promise<string | null>;
};
type StorageDeleter = {
  delete: (id: Id<"_storage">) => Promise<void>;
};

/** Thumbnails must be small image data URLs so the doc stays under 1 MiB. */
function normalizeThumbnail(thumbnail: string | undefined): string | undefined {
  if (!thumbnail) return undefined;
  if (!thumbnail.startsWith("data:image/")) {
    throw new Error("The thumbnail must be an image file.");
  }
  if (thumbnail.length > MAX_THUMBNAIL_CHARS) {
    throw new Error("That thumbnail is too large — pick a smaller image.");
  }
  return thumbnail;
}

/**
 * Confirms the just-uploaded object really is a small PDF by reading its
 * metadata from the `_storage` system table. Returns the byte size so the
 * document never trusts a client-reported file size.
 */
async function assertStoredPdf(
  db: GenericDatabaseReader<DataModel>,
  fileStorageId: string,
): Promise<number> {
  const meta = await db.system.get(
    "_storage",
    fileStorageId as Id<"_storage">,
  );
  if (!meta) {
    throw new Error("The uploaded file could not be found — please retry.");
  }
  if (typeof meta.size === "number" && meta.size > MAX_PDF_BYTES) {
    throw new Error("PDF files must be 10 MB or smaller.");
  }
  if (meta.size === 0) throw new Error("The PDF file is empty.");
  const contentType = meta.contentType;
  if (contentType && contentType !== "application/pdf") {
    throw new Error("That file doesn't look like a PDF.");
  }
  return typeof meta.size === "number" ? meta.size : 0;
}

async function deleteStoredFile(storage: StorageDeleter, id: string) {
  try {
    await storage.delete(id as Id<"_storage">);
  } catch {
    // Already gone — deleting the record must not fail because of it.
  }
}

/** Public-facing shape of a PDF row (never includes the raw storage id). */
interface PdfView {
  _id: Id<"pdfs">;
  title: string;
  description: string | undefined;
  category: string | undefined;
  visibility: "public" | "members";
  published: boolean;
  publishedAt: number | undefined;
  createdAt: number | undefined;
  fileName: string | undefined;
  fileSize: number | undefined;
  thumbnail: string | undefined;
  locked: boolean;
  pdfUrl: string | null;
}

/**
 * Access rules:
 * - published + public       → everyone
 * - published + members-only → signed-in community members (and the admin)
 * - unpublished drafts       → admin only (hidden entirely otherwise)
 */
function canAccess(pdf: Doc<"pdfs">, signedIn: boolean, admin: boolean) {
  if (pdf.published !== true) return admin;
  if (pdf.visibility === "members") return signedIn || admin;
  return true;
}

async function shapePdf(
  storage: StorageUrlReader,
  pdf: Doc<"pdfs">,
  signedIn: boolean,
  admin: boolean,
): Promise<PdfView> {
  const allowed = canAccess(pdf, signedIn, admin);
  let pdfUrl: string | null = null;
  if (allowed && pdf.fileStorageId) {
    pdfUrl = await storage.getUrl(pdf.fileStorageId as Id<"_storage">);
  }
  return {
    _id: pdf._id,
    title: pdf.title,
    description: pdf.description,
    category: pdf.category,
    visibility: pdf.visibility === "members" ? "members" : "public",
    published: pdf.published === true,
    publishedAt: pdf.publishedAt,
    createdAt: pdf.createdAt,
    fileName: pdf.fileName,
    fileSize: pdf.fileSize,
    thumbnail: pdf.thumbnail,
    // "locked" tells the UI to show the join/login gate instead of the file.
    locked: !allowed,
    pdfUrl,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listPdfs = query({
  args: {
    filter: v.optional(v.string()),
    category: v.optional(v.string()),
    // Admin only — drafts never leave the server for anyone else.
    includeDrafts: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const adminViewer = await isAdmin(ctx);
    const includeDrafts = args.includeDrafts === true && adminViewer;
    const all = await ctx.db.query("pdfs").take(MAX_DOCS);

    let items = all.filter((pdf) => includeDrafts || pdf.published === true);
    if (args.category) {
      const category = args.category;
      items = items.filter((pdf) => pdf.category === category);
    }
    if (args.filter) {
      const term = args.filter.toLowerCase();
      items = items.filter((pdf) =>
        `${pdf.title} ${pdf.description ?? ""} ${pdf.category ?? ""}`
          .toLowerCase()
          .includes(term),
      );
    }
    items.sort(
      (a, b) =>
        (b.publishedAt ?? b.createdAt ?? 0) -
        (a.publishedAt ?? a.createdAt ?? 0),
    );

    const signedIn = (await getAuthUserId(ctx)) !== null;
    const mapped = await Promise.all(
      items.map((pdf) => shapePdf(ctx.storage, pdf, signedIn, adminViewer)),
    );

    const categories = Array.from(
      new Set(
        all
          .filter(
            (pdf) =>
              (includeDrafts || pdf.published === true) &&
              typeof pdf.category === "string" &&
              pdf.category.length > 0,
          )
          .map((pdf) => pdf.category as string),
      ),
    );

    return { items: mapped, total: mapped.length, categories };
  },
});

export const getPdf = query({
  // Raw string on purpose: URL params can contain malformed ids — safeGet
  // returns null so the page can show its not-found state instead of throwing.
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const pdf = await safeGet<Doc<"pdfs">, DataModel>(ctx.db, args.id);
    if (!pdf) return null;
    const adminViewer = await isAdmin(ctx);
    // Unpublished drafts look identical to "not found" for visitors.
    if (pdf.published !== true && !adminViewer) return null;
    const signedIn = (await getAuthUserId(ctx)) !== null;
    return await shapePdf(ctx.storage, pdf, signedIn, adminViewer);
  },
});

// ---------------------------------------------------------------------------
// Mutations (admin only)
// ---------------------------------------------------------------------------

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    // Short-lived URL the browser POSTs the raw PDF to; the response comes
    // back with `{ storageId }`.
    return await ctx.storage.generateUploadUrl();
  },
});

const metadataArgs = {
  title: v.string(),
  description: v.optional(v.string()),
  category: v.optional(v.string()),
  visibility: v.optional(v.string()), // "public" | "members"
  published: v.optional(v.boolean()),
  publishedAt: v.optional(v.number()),
  fileName: v.optional(v.string()),
  thumbnail: v.optional(v.string()),
};

export const createPdf = mutation({
  args: {
    ...metadataArgs,
    // Storage id returned by the upload URL POST.
    fileStorageId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const title = args.title.trim();
    if (!title) throw new Error("A title is required.");
    const thumbnail = normalizeThumbnail(args.thumbnail);
    const fileSize = await assertStoredPdf(ctx.db, args.fileStorageId);
    const now = Date.now();
    const published = args.published === true;
    return await ctx.db.insert("pdfs", {
      title,
      description: args.description?.trim() || undefined,
      category: args.category?.trim() || "General",
      visibility: args.visibility === "members" ? "members" : "public",
      published,
      publishedAt: args.publishedAt ?? (published ? now : undefined),
      fileStorageId: args.fileStorageId,
      fileName: args.fileName?.trim() || undefined,
      fileSize,
      thumbnail,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePdf = mutation({
  args: {
    id: v.id("pdfs"),
    ...metadataArgs,
    // Optional replacement — when present the old file is swapped out.
    fileStorageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("PDF not found.");
    const title = args.title.trim();
    if (!title) throw new Error("A title is required.");

    const published = args.published ?? existing.published ?? false;
    const patch: Partial<Doc<"pdfs">> = {
      title,
      description: args.description?.trim() || undefined,
      category: args.category?.trim() || "General",
      visibility: args.visibility === "members" ? "members" : "public",
      published,
      publishedAt:
        args.publishedAt ??
        existing.publishedAt ??
        (published ? Date.now() : undefined),
      fileName: args.fileName?.trim() || existing.fileName,
      // The client always echoes the current thumbnail; omitting it clears it.
      thumbnail: normalizeThumbnail(args.thumbnail),
      updatedAt: Date.now(),
    };

    if (args.fileStorageId) {
      const fileSize = await assertStoredPdf(ctx.db, args.fileStorageId);
      patch.fileStorageId = args.fileStorageId;
      patch.fileSize = fileSize;
      if (existing.fileStorageId) {
        await deleteStoredFile(ctx.storage, existing.fileStorageId);
      }
    } else {
      patch.fileStorageId = existing.fileStorageId;
      patch.fileSize = existing.fileSize;
    }

    await ctx.db.patch(args.id, patch);
    return true;
  },
});

export const setPdfPublished = mutation({
  args: { id: v.id("pdfs"), published: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const pdf = await ctx.db.get(args.id);
    if (!pdf) throw new Error("PDF not found.");
    await ctx.db.patch(args.id, {
      published: args.published,
      // Keep an admin-chosen publish date; only backfill one when missing.
      publishedAt: pdf.publishedAt ?? (args.published ? Date.now() : undefined),
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const deletePdf = mutation({
  args: { id: v.id("pdfs") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const pdf = await ctx.db.get(args.id);
    if (!pdf) throw new Error("PDF not found.");
    if (pdf.fileStorageId) {
      await deleteStoredFile(ctx.storage, pdf.fileStorageId);
    }
    await ctx.db.delete(args.id);
    return true;
  },
});
