import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowLeft, ArrowRight, FileSearch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/site/PageHeader";
import { ArticleCard } from "@/components/site/ArticleCard";
import { EmptyState } from "@/components/site/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <Skeleton className="aspect-[3/2] rounded-xl" />
      <div className="space-y-2 px-1 pt-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

/** Editorial article listing with search and category filtering. */
export default function Articles() {
  usePageMeta(
    "Articles",
    "Essays and field notes on technology, education, science and society.",
  );

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => setPage(1), [debounced, category]);

  const result = useQuery(api.articles.listArticles, {
    filter: debounced || undefined,
    category: category === "all" ? undefined : category,
    page,
  });

  const categories = Array.from(
    new Set((result?.items ?? []).map((a) => a.category)),
  ).sort();
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader
        eyebrow="Read"
        title="The journal"
        description="Long-form thinking, written slowly — on technology, education, Nepal and the world around us."
      >
        <div className="relative max-w-xl">
          <SearchGlyph className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles…"
            className="h-12 rounded-full border-border bg-card/80 pr-4 pl-11 text-base shadow-sm backdrop-blur"
            aria-label="Search articles"
          />
        </div>
      </PageHeader>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={category === "all"} onClick={() => setCategory("all")}>
            All topics
          </Chip>
          {categories.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
          <span className="ml-auto text-sm text-muted-foreground">
            {result ? `${result.total} article${result.total === 1 ? "" : "s"}` : ""}
          </span>
        </div>

        <div className="mt-8">
          {result === undefined ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : result.items.length === 0 ? (
            <EmptyState
              icon={FileSearch}
              title="No articles found"
              description={
                debounced || category !== "all"
                  ? "Nothing matches that search yet — try different keywords."
                  : "The journal is quiet for now. New essays will appear here once published."
              }
              action={
                debounced || category !== "all" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuery("");
                      setCategory("all");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Link
                    to="/content"
                    className="inline-flex items-center gap-2 rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
                  >
                    Watch videos instead
                    <ArrowRight className="size-4" />
                  </Link>
                )
              }
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((article) => (
                <ArticleCard key={article._id} article={article} />
              ))}
            </div>
          )}
        </div>

        {result && result.total > PAGE_SIZE && (
          <div className="mt-10 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ArrowLeft className="size-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

        {result && result.total === 0 && (
          <div className="mt-4 flex justify-center">
            <Link
              to="/community"
              className="inline-flex items-center gap-2 text-sm font-medium text-ember hover:text-clay"
            >
              Suggest an article topic
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}
      </section>
    </>
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
          : "border-border bg-card text-muted-foreground hover:-translate-y-0.5 hover:border-gold/50 hover:text-gold",
      )}
    >
      {children}
    </button>
  );
}

function SearchGlyph({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
