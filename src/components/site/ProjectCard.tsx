import { Link } from "react-router";
import { ArrowUpRight, Github, Globe } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";
import { MediaThumb } from "@/components/site/MediaThumb";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  Idea: "bg-dusk/15 text-dusk border-dusk/30",
  Building: "bg-gold/15 text-gold border-gold/30",
  Completed: "bg-sage/15 text-sage border-sage/30",
  Archived: "bg-muted text-muted-foreground border-border",
};

/** Elegant project card with status, progress and outbound links. */
export function ProjectCard({
  project,
  className,
}: {
  project: Doc<"projects">;
  className?: string;
}) {
  const status = project.status ?? "Idea";
  const progress = project.progress ?? 0;
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-400",
        "hover:-translate-y-1 hover:border-sage/40 hover:shadow-[0_18px_40px_-24px_var(--sage)]",
        className,
      )}
    >
      <Link to={`/projects/${project._id}`} className="flex flex-col">
        <MediaThumb
          src={project.thumbnail}
          alt={project.name}
          category={project.category}
          className="aspect-[16/9] rounded-t-2xl rounded-b-none"
        >
          <span
            className={cn(
              "absolute top-3 left-3 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase backdrop-blur-sm",
              STATUS_STYLES[status] ?? STATUS_STYLES.Idea,
              "bg-background/60",
            )}
          >
            {status}
          </span>
          <span className="absolute right-3 bottom-3 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
            {project.category}
          </span>
        </MediaThumb>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-display text-xl leading-snug font-semibold text-foreground transition-colors group-hover:text-sage">
            {project.name}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {project.description}
          </p>

          {status === "Building" && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-gold">In progress</span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold to-ember transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            </div>
          )}

          {project.technologies.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {project.technologies.slice(0, 4).map((tech) => (
                <span
                  key={tech}
                  className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>

      <div className="mt-auto flex items-center gap-2 border-t border-border px-5 py-3">
        <Link
          to={`/projects/${project._id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-sage"
        >
          Details
          <ArrowUpRight className="size-4" />
        </Link>
        <div className="ml-auto flex items-center gap-1">
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${project.name} on GitHub`}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Github className="size-4" />
            </a>
          )}
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${project.name} live site`}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Globe className="size-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
