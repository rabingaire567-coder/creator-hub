import { useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  FileX,
  Lock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaThumb } from "@/components/site/MediaThumb";
import { EmptyState } from "@/components/site/EmptyState";
import { usePageMeta } from "@/lib/seo";
import { formatDate } from "@/lib/format";
import { downloadPdf, formatFileSize } from "@/lib/pdf";
import { cn } from "@/lib/utils";

/**
 * Clean PDF viewer/preview page.
 *
 * - Public PDFs render in an embedded viewer with download controls.
 * - Members-only PDFs show a join/login gate for signed-out visitors
 *   (the backend never issues them a file URL in the first place).
 */
export default function PdfDetail() {
  const { id = "" } = useParams();
  const pdf = useQuery(api.pdfs.getPdf, { id });
  const [downloading, setDownloading] = useState(false);

  usePageMeta(pdf?.title, pdf?.description);

  // ---- Loading ----
  if (pdf === undefined) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 pt-36 pb-24">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-6 h-10 w-1/2" />
        <Skeleton className="mt-4 h-5 w-2/3" />
        <Skeleton className="mt-8 h-[60vh] w-full rounded-3xl" />
      </div>
    );
  }

  // ---- Not found / unpublished ----
  if (pdf === null) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-36 pb-24 text-center">
        <EmptyState
          icon={FileX}
          title="PDF not found"
          description="It may be unpublished, or the link is incorrect."
          action={
            <Link
              to="/pdfs"
              className="inline-flex items-center gap-2 rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              <ArrowLeft className="size-4" />
              PDF Library
            </Link>
          }
        />
      </div>
    );
  }

  const publishedAt = pdf.publishedAt ?? pdf.createdAt;
  const membersOnly = pdf.visibility === "members";
  const downloadName = pdf.fileName || `${pdf.title}.pdf`;

  const handleDownload = async () => {
    if (!pdf.pdfUrl) return;
    setDownloading(true);
    try {
      await downloadPdf(pdf.pdfUrl, downloadName);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pt-28 pb-24 sm:px-6 sm:pt-32">
      <Link
        to="/pdfs"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ember"
      >
        <ArrowLeft className="size-4" />
        PDF Library
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-ember/30 bg-ember/10 px-3 py-1 text-xs font-semibold tracking-wider text-ember uppercase">
          <FileText className="size-3" />
          PDF
        </span>
        {pdf.category && (
          <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
            {pdf.category}
          </span>
        )}
        {membersOnly && (
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">
            <Lock className="size-3" />
            Community members only
          </span>
        )}
        <span className="text-sm text-muted-foreground">
          {formatDate(publishedAt)}
        </span>
      </div>

      <h1 className="font-display mt-4 text-4xl leading-[1.1] font-semibold tracking-tight text-foreground text-balance sm:text-5xl">
        {pdf.title}
      </h1>
      {pdf.description && (
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {pdf.description}
        </p>
      )}

      {/* ---- Members-only gate ---- */}
      {pdf.locked ? (
        <div className="mt-10">
          {pdf.thumbnail && (
            <div className="pointer-events-none mb-8 opacity-60 grayscale">
              <MediaThumb
                src={pdf.thumbnail}
                alt={pdf.title}
                category={pdf.category}
                className="aspect-[16/9] rounded-3xl border border-border"
              />
            </div>
          )}
          <EmptyState
            icon={Lock}
            title="This PDF is for community members"
            description="Log in or join the community to read and download this PDF — it only takes a moment."
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  to={`/auth?returnTo=${encodeURIComponent(`/pdfs/${pdf._id}`)}`}
                  className="inline-flex items-center gap-2 rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
                >
                  <Lock className="size-4" />
                  Log in / Join the community
                </Link>
                <Link
                  to="/pdfs"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-ember/50 hover:text-ember"
                >
                  Back to PDF Library
                </Link>
              </div>
            }
          />
        </div>
      ) : !pdf.pdfUrl ? (
        /* ---- Stored file missing (defensive) ---- */
        <div className="mt-10">
          <EmptyState
            icon={FileX}
            title="The file is unavailable"
            description="This PDF's file could not be loaded right now. Please try again later."
          />
        </div>
      ) : (
        <>
          {/* ---- Actions ---- */}
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-ember hover:text-white disabled:opacity-60"
            >
              <Download className="size-4" />
              {downloading ? "Preparing…" : "Download PDF"}
            </button>
            <a
              href={pdf.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-ember/50 hover:text-ember"
            >
              <ExternalLink className="size-4" />
              Open in new tab
            </a>
            {pdf.fileSize ? (
              <span className="inline-flex items-center self-center text-xs text-muted-foreground">
                {formatFileSize(pdf.fileSize)}
                {pdf.fileName ? ` · ${pdf.fileName}` : ""}
              </span>
            ) : null}
          </div>

          {/* ---- Embedded viewer ---- */}
          <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-muted shadow-[0_30px_80px_-50px_rgba(0,0,0,0.9)]">
            <iframe
              src={`${pdf.pdfUrl}#toolbar=0&navpanes=0`}
              title={`Preview — ${pdf.title}`}
              className={cn("h-[70vh] w-full border-0 bg-white")}
            />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Preview uses your browser's built-in PDF renderer.
          </p>
        </>
      )}
    </section>
  );
}
