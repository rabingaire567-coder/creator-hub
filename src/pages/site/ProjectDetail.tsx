import { Link, useParams } from "react-router";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { ArrowLeft, Github, Globe, Link2, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaThumb } from "@/components/site/MediaThumb";
import { EmptyState } from "@/components/site/EmptyState";
import { ProjectCard } from "@/components/site/ProjectCard";
import { SectionHeading } from "@/components/site/SectionHeading";
import { usePageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  Idea: "bg-dusk/15 text-dusk border-dusk/30",
  Building: "bg-gold/15 text-gold border-gold/30",
  Completed: "bg-sage/15 text-sage border-sage/30",
  Archived: "bg-muted text-muted-foreground border-border",
};

export default function ProjectDetail() {
  const { id = "" } = useParams();
  const project = useQuery(api.projects.getProjectById, { id });
  const all = useQuery(api.projects.listProjects, {});

  usePageMeta(project?.name, project?.description);

  const others = (all?.items ?? []).filter((p) => p._id !== id).slice(0, 3);

  if (project === null) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-36 pb-24 text-center">
        <EmptyState
          icon={Link2}
          title="Project not found"
          description="It may be unpublished, or the link is incorrect."
          action={
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              <ArrowLeft className="size-4" />
              All projects
            </Link>
          }
        />
      </div>
    );
  }

  if (project === undefined) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 pt-36 pb-24">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-6 h-10 w-1/2" />
        <Skeleton className="mt-8 aspect-[16/9] w-full rounded-3xl" />
      </div>
    );
  }

  const status = project.status ?? "Idea";
  const progress = project.progress ?? 0;

  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-4 pt-28 sm:px-6 sm:pt-32">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ember"
        >
          <ArrowLeft className="size-4" />
          All projects
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase",
              STATUS_STYLES[status] ?? STATUS_STYLES.Idea,
            )}
          >
            {status}
          </span>
          <span className="text-sm text-muted-foreground">{project.category}</span>
        </div>

        <h1 className="font-display mt-4 text-4xl leading-[1.1] font-semibold tracking-tight text-foreground text-balance sm:text-5xl">
          {project.name}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {project.description}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-ember/50 hover:text-ember"
            >
              <Github className="size-4" />
              Source code
            </a>
          )}
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-ember hover:text-white"
            >
              <Globe className="size-4" />
              Live preview
            </a>
          )}
        </div>

        <MediaThumb
          src={project.thumbnail}
          alt={project.name}
          category={project.category}
          className="mt-10 aspect-[16/9] rounded-3xl border border-border shadow-[0_30px_80px_-50px_rgba(0,0,0,0.9)]"
        />

        {/* Facts grid */}
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Status
            </p>
            <p className="font-display mt-2 text-xl font-semibold text-foreground">
              {status}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Progress
            </p>
            <p className="font-display mt-2 text-xl font-semibold text-foreground tabular-nums">
              {progress}%
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold via-ember to-clay"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Category
            </p>
            <p className="font-display mt-2 text-xl font-semibold text-foreground">
              {project.category}
            </p>
          </div>
        </div>

        {project.technologies.length > 0 && (
          <div className="mt-10">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              <Sparkles className="size-4 text-sage" />
              Built with
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.technologies.map((tech) => (
                <span
                  key={tech}
                  className="rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {others.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeading eyebrow="More work" title="Other projects" />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((item) => (
              <ProjectCard key={item._id} project={item} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
