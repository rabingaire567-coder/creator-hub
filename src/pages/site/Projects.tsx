import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowRight, SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/site/PageHeader";
import { ProjectCard } from "@/components/site/ProjectCard";
import { EmptyState } from "@/components/site/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageMeta } from "@/lib/seo";
import { PROJECT_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Projects portfolio with status filters and live search. */
export default function Projects() {
  usePageMeta(
    "Projects",
    "Web projects, experiments and tools built by Rabin Gaire.",
  );

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const result = useQuery(api.projects.listProjects, {
    filter: debounced || undefined,
    status: status === "all" ? undefined : status,
  });

  const statuses = useMemo(() => {
    const used = new Set<string>(PROJECT_STATUSES as unknown as string[]);
    for (const p of result?.items ?? []) {
      if (p.status) used.add(p.status);
    }
    return Array.from(used);
  }, [result?.items]);

  return (
    <>
      <PageHeader
        eyebrow="Build"
        title="Projects"
        description="Web projects, tools and experiments — with honest statuses, progress and source code where it's open."
      >
        <div className="relative max-w-xl">
          <SearchGlyph className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, tech…"
            className="h-12 rounded-full border-border bg-card/80 pr-4 pl-11 text-base shadow-sm backdrop-blur"
            aria-label="Search projects"
          />
        </div>
      </PageHeader>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={status === "all"} onClick={() => setStatus("all")}>
            All
          </Chip>
          {statuses.map((s) => (
            <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
              {s}
            </Chip>
          ))}
          <span className="ml-auto text-sm text-muted-foreground">
            {result ? `${result.total} project${result.total === 1 ? "" : "s"}` : ""}
          </span>
        </div>

        <div className="mt-8">
          {result === undefined ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card p-3"
                >
                  <Skeleton className="aspect-[16/9] rounded-t-2xl" />
                  <div className="space-y-2 p-2">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : result.items.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No projects match"
              description={
                debounced || status !== "all"
                  ? "Try a different search term or status."
                  : "Projects will appear here once published from the dashboard."
              }
              action={
                debounced || status !== "all" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuery("");
                      setStatus("all");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Link
                    to="/content"
                    className="inline-flex items-center gap-2 rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
                  >
                    Watch the latest video
                    <ArrowRight className="size-4" />
                  </Link>
                )
              }
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((project) => (
                <ProjectCard key={project._id} project={project} />
              ))}
            </div>
          )}
        </div>
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
          : "border-border bg-card text-muted-foreground hover:-translate-y-0.5 hover:border-sage/50 hover:text-sage",
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
