import { Link } from "react-router";
import { ArrowUpRight, Clock3 } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";
import { MediaThumb } from "@/components/site/MediaThumb";
import { TagPill } from "@/components/site/TagPill";
import { formatDate } from "@/lib/format";
import { toneForCategory } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Editorial card for an article — prioritises cover, title and reading meta. */
export function ArticleCard({
  article,
  className,
}: {
  article: Doc<"articles">;
  className?: string;
}) {
  return (
    <Link
      to={`/articles/${article.slug}`}
      className={cn(
        "group flex flex-col rounded-2xl border border-border bg-card p-3 transition-all duration-400",
        "hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_18px_40px_-24px_var(--gold)]",
        className,
      )}
    >
      <MediaThumb
        src={article.cover}
        alt={article.title}
        category={article.category}
        className="aspect-[3/2] rounded-xl"
      >
        <span
          className={cn(
            "absolute top-3 left-3 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase backdrop-blur-sm",
            toneForCategory(article.category),
            "bg-background/60",
          )}
        >
          {article.category}
        </span>
      </MediaThumb>

      <div className="flex flex-1 flex-col px-1 pt-4 pb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDate(article.publishedAt ?? article.createdAt)}</span>
          {article.readingTime ? (
            <>
              <span aria-hidden>•</span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3" />
                {article.readingTime} min read
              </span>
            </>
          ) : null}
        </div>
        <h3 className="font-display mt-2 line-clamp-2 text-xl leading-snug font-semibold text-foreground transition-colors group-hover:text-gold">
          {article.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {article.excerpt}
        </p>
        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="flex flex-wrap gap-1.5">
            {article.tags.slice(0, 2).map((tag) => (
              <TagPill key={tag} name={tag} />
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gold opacity-0 transition-all duration-400 group-hover:opacity-100">
            Read
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
