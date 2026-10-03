import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowLeft, ArrowRight, Play, SearchX, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/site/PageHeader";
import { ContentCard } from "@/components/site/ContentCard";
import { EmptyState } from "@/components/site/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageMeta } from "@/lib/seo";
import { CONTENT_CATEGORIES, toneForCategory } from "@/lib/constants";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <Skeleton className="aspect-video rounded-xl" />
      <div className="space-y-2 px-1 pt-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

/** Full content library: search, category/tag filtering, sorting, pagination. */
export default function Content() {
  usePageMeta(
    "Content",
    "Documentaries, explainers and videos on technology, education, Nepal and more.",
  );

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [tag, setTag] = useState<string>("all");
  const [sort, setSort] = useState<string>("newest");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => setPage(1), [debounced, category, tag, sort, featuredOnly]);

  const tags = useQuery(api.tags.listTags);
  const result = useQuery(api.posts.listPosts, {
    filter: debounced || undefined,
    category: category === "all" ? undefined : category,
    tag: tag === "all" ? undefined : tag,
    featuredOnly: featuredOnly || undefined,
    sort,
    page,
  });

  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE));

  const categories = useMemo(() => {
    const used = new Set<string>(CONTENT_CATEGORIES as unknown as string[]);
    for (const item of result?.items ?? []) {
      for (const c of item.categories) used.add(c);
    }
    return Array.from(used);
  }, [result?.items]);

  return (
    <>
      <PageHeader
        eyebrow="Watch"
        title="Content library"
        description="Every film, explainer and short — searchable, filterable and always up to date from the dashboard."
      >
        <div className="relative max-w-xl">
          <SearchIcon className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles, topics, tags…"
            className="h-12 rounded-full border-border bg-card/80 pr-4 pl-11 text-base shadow-sm backdrop-blur"
            aria-label="Search content"
          />
        </div>
      </PageHeader>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        {/* Category chips */}
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={category === "all"} onClick={() => setCategory("all")}>
            All
          </Chip>
          {categories.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </div>

        {/* Controls row */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger className="w-40" aria-label="Filter by tag">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {(tags ?? []).map((t) => (
                <SelectItem key={t._id} value={t.name}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-40" aria-label="Sort content">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="views">Most viewed</SelectItem>
              <SelectItem value="title">Title A–Z</SelectItem>
            </SelectContent>
          </Select>

          <button
            onClick={() => setFeaturedOnly((v) => !v)}
            aria-pressed={featuredOnly}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              featuredOnly
                ? "border-gold/50 bg-gold/15 text-gold"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Star className={cn("size-3.5", featuredOnly && "fill-current")} />
            Featured only
          </button>

          <span className="ml-auto text-sm text-muted-foreground">
            {result ? `${result.total} item${result.total === 1 ? "" : "s"}` : ""}
          </span>
        </div>

        {/* Grid */}
        <div className="mt-8">
          {result === undefined ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : result.items.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No content matches those filters"
              description="Try a different search term, category or tag — or clear the filters to see everything."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setCategory("all");
                    setTag("all");
                    setFeaturedOnly(false);
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((post) => (
                <ContentCard key={post._id} post={post} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
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

        {/* Empty library */}
        {result && result.total === 0 && !debounced && category === "all" && (
          <div className="mt-4">
            <EmptyState
              icon={Play}
              title="No videos published yet"
              description="Once the owner publishes content from the dashboard, everything will appear here automatically."
              action={
                <Link
                  to="/community"
                  className="inline-flex items-center gap-2 rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
                >
                  Suggest the first topic
                  <ArrowRight className="size-4" />
                </Link>
              }
            />
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
          : "border-border bg-card text-muted-foreground hover:-translate-y-0.5 hover:border-ember/40 hover:text-ember",
      )}
    >
      {children}
    </button>
  );
}

function SearchIcon({ className }: { className?: string }) {
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
