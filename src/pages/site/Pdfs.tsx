import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Download, Eye, FileText, Lock, Search, SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/site/PageHeader";
import { MediaThumb } from "@/components/site/MediaThumb";
import { EmptyState } from "@/components/site/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageMeta } from "@/lib/seo";
import { formatDate } from "@/lib/format";
import { downloadPdf, formatFileSize } from "@/lib/pdf";
import { cn } from "@/lib/utils";

/** Shape returned by api.pdfs.listPdfs for each row. */
interface PdfListItem {
  _id: string;
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
 * Public 📄 PDF Library — responsive cards with thumbnail, title,
 * description, category, published date and View / Download actions.
 * Members-only PDFs stay visible but route visitors to the login gate.
 */
export default function Pdfs() {
  usePageMeta(
    "PDF Library",
    "Guides, templates and resources to read online or download — some reserved for community members.",
  );

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const result = useQuery(api.pdfs.listPdfs, {
    filter: debounced || undefined,
    category: category === "all" ? undefined : category,
  });

  const handleDownload = async (pdf: PdfListItem) => {
    if (pdf.locked || !pdf.pdfUrl) {
      // Members-only — send visitors through the join/login gate.
      navigate(`/pdfs/${pdf._id}`);
      return;
    }
    setDownloadingId(pdf._id);
    try {
      await downloadPdf(pdf.pdfUrl, pdf.fileName || `${pdf.title}.pdf`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="📄 PDF Library"
        description="Guides, templates and deep dives — read in your browser or download for later. Some picks are reserved for community members."
      >
        <div className="relative max-w-xl">
          <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search PDFs, topics…"
            className="h-12 rounded-full border-border bg-card/80 pr-4 pl-11 text-base shadow-sm backdrop-blur"
            aria-label="Search PDFs"
          />
        </div>
      </PageHeader>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={category === "all"} onClick={() => setCategory("all")}>
            All
          </Chip>
          {(result?.categories ?? []).map((item) => (
            <Chip key={item} active={category === item} onClick={() => setCategory(item)}>
              {item}
            </Chip>
          ))}
          <span className="ml-auto text-sm text-muted-foreground">
            {result
              ? `${result.total} PDF${result.total === 1 ? "" : "s"}`
              : ""}
          </span>
        </div>

        <div className="mt-8">
          {result === undefined ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card p-3"
                >
                  <Skeleton className="aspect-[16/10] rounded-t-2xl" />
                  <div className="space-y-2 p-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : result.items.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No PDFs match"
              description={
                debounced || category !== "all"
                  ? "Try a different search term or category."
                  : "New PDFs will appear here once they are published from the studio."
              }
              action={
                debounced || category !== "all" ? (
                  <button
                    onClick={() => {
                      setQuery("");
                      setCategory("all");
                    }}
                    className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-ember hover:text-white"
                  >
                    Clear filters
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((pdf) => (
                <PdfCard
                  key={pdf._id}
                  pdf={pdf}
                  downloading={downloadingId === pdf._id}
                  onDownload={() => handleDownload(pdf)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function PdfCard({
  pdf,
  downloading,
  onDownload,
}: {
  pdf: PdfListItem;
  downloading: boolean;
  onDownload: () => void;
}) {
  const publishedAt = pdf.publishedAt ?? pdf.createdAt;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-400 hover:-translate-y-1 hover:border-ember/40 hover:shadow-[0_18px_40px_-24px_var(--ember)]">
      <Link to={`/pdfs/${pdf._id}`} className="flex flex-col">
        <MediaThumb
          src={pdf.thumbnail}
          alt={pdf.title}
          category={pdf.category}
          className="aspect-[16/10] rounded-t-2xl rounded-b-none"
        >
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full border border-ember/40 bg-ember/90 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white uppercase backdrop-blur-sm">
            <FileText className="size-3" />
            PDF
          </span>
          {pdf.visibility === "members" && (
            <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-gold/40 bg-background/80 px-2.5 py-0.5 text-[11px] font-semibold text-gold backdrop-blur-sm">
              <Lock className="size-3" />
              Members only
            </span>
          )}
          <span className="absolute right-3 bottom-3 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
            {pdf.category || "General"}
          </span>
        </MediaThumb>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-display text-xl leading-snug font-semibold text-foreground transition-colors group-hover:text-ember">
            {pdf.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {pdf.description || "No description yet."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDate(publishedAt)}</span>
            {pdf.fileSize ? (
              <>
                <span aria-hidden>•</span>
                <span>{formatFileSize(pdf.fileSize)}</span>
              </>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border px-5 py-3.5">
        <Link
          to={`/pdfs/${pdf._id}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background transition-colors hover:bg-ember hover:text-white"
        >
          <Eye className="size-3.5" />
          View PDF
        </Link>
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-ember/50 hover:text-ember disabled:opacity-60"
        >
          <Download className="size-3.5" />
          {downloading
            ? "Preparing…"
            : pdf.locked
              ? "Members only"
              : "Download PDF"}
        </button>
        {pdf.locked && (
          <Lock className="ml-auto size-3.5 text-gold" aria-label="Members only" />
        )}
      </div>
    </article>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-300",
        active
          ? "border-transparent bg-foreground text-background shadow-sm"
          : "border-border bg-card text-muted-foreground hover:-translate-y-0.5 hover:border-ember/50 hover:text-ember",
      )}
    >
      {children}
    </button>
  );
}
