import { Link } from "react-router";
import { ArrowUpRight, Clock3, Play } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";
import { MediaThumb } from "@/components/site/MediaThumb";
import { TagPill } from "@/components/site/TagPill";
import { formatDate } from "@/lib/format";
import { toneForCategory } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Editorial card for a video / content item. Subtle image zoom + soft overlay
 * + clear CTA on hover — no excessive effects.
 */
export function ContentCard({
  post,
  className,
}: {
  post: Doc<"posts">;
  className?: string;
}) {
  const category = post.categories[0];
  return (
    <Link
      to={`/content/${post._id}`}
      className={cn(
        "group flex flex-col rounded-2xl border border-border bg-card p-3 transition-all duration-400",
        "hover:-translate-y-1 hover:border-ember/35 hover:shadow-[0_18px_40px_-24px_var(--ember)]",
        className,
      )}
    >
      <div className="relative">
        <MediaThumb
          src={post.thumbnail}
          youtubeId={post.youtubeId}
          alt={post.title}
          category={category}
          className="aspect-video rounded-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          {post.youtubeId && (
            <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100">
              <span className="flex size-12 items-center justify-center rounded-full bg-background/85 text-ember shadow-lg backdrop-blur-sm">
                <Play className="size-5 fill-current" />
              </span>
            </span>
          )}
          <span
            className={cn(
              "absolute top-3 left-3 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase backdrop-blur-sm",
              toneForCategory(category),
              "bg-background/60",
            )}
          >
            {category || "Video"}
          </span>
          {(post.duration || post.publishedAt) && (
            <span className="absolute right-3 bottom-3 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white tabular-nums">
              {post.duration || formatDate(post.publishedAt)}
            </span>
          )}
        </MediaThumb>
      </div>

      <div className="flex flex-1 flex-col px-1 pt-4 pb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
          {post.duration && (
            <>
              <span aria-hidden>•</span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3" />
                {post.duration}
              </span>
            </>
          )}
        </div>
        <h3 className="font-display mt-2 line-clamp-2 text-lg leading-snug font-semibold text-foreground transition-colors group-hover:text-ember">
          {post.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {post.excerpt}
        </p>
        {post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <TagPill key={tag} name={tag} />
            ))}
          </div>
        )}
        <span className="mt-4 inline-flex items-center gap-1.5 pt-1 text-sm font-medium text-ember opacity-0 transition-all duration-400 group-hover:opacity-100">
          Watch now
          <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}
