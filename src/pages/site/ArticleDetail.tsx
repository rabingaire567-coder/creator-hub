import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Feather,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaThumb } from "@/components/site/MediaThumb";
import { ArticleCard } from "@/components/site/ArticleCard";
import { EmptyState } from "@/components/site/EmptyState";
import { SectionHeading } from "@/components/site/SectionHeading";
import { TagPill } from "@/components/site/TagPill";
import { Markdown } from "@/lib/markdown";
import { formatDate, readingTime } from "@/lib/format";
import { usePageMeta } from "@/lib/seo";

/** Long-form article page optimised for comfortable reading. */
export default function ArticleDetail() {
  const { slug = "" } = useParams();
  const article = useQuery(api.articles.getArticleBySlug, { slug });
  const related = useQuery(
    api.articles.listRelatedArticles,
    article ? { articleId: article._id, limit: 3 } : "skip",
  );
  const [copied, setCopied] = useState(false);

  usePageMeta(article?.title, article?.excerpt);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  if (article === null) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-36 pb-24 text-center">
        <EmptyState
          icon={Feather}
          title="This article isn't published"
          description="It may be a draft, unpublished, or the link may be incorrect."
          action={
            <Link
              to="/articles"
              className="inline-flex items-center gap-2 rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              <ArrowLeft className="size-4" />
              Back to articles
            </Link>
          }
        />
      </div>
    );
  }

  if (article === undefined) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-36 pb-24">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-6 h-11 w-4/5" />
        <Skeleton className="mt-4 h-4 w-1/2" />
        <Skeleton className="mt-10 aspect-[3/2] w-full rounded-3xl" />
        <div className="mt-8 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  const minutes = article.readingTime ?? readingTime(article.content);

  return (
    <>
      <article className="mx-auto w-full max-w-3xl px-4 pt-28 sm:pt-32">
        <Link
          to="/articles"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ember"
        >
          <ArrowLeft className="size-4" />
          All articles
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-semibold tracking-wider uppercase text-gold">
            {article.category}
          </span>
          {article.featured && (
            <span className="rounded-full border border-ember/40 bg-ember/10 px-3 py-1 text-xs font-semibold tracking-wider uppercase text-ember">
              Featured
            </span>
          )}
        </div>

        <h1 className="font-display mt-5 text-4xl leading-[1.1] font-semibold tracking-tight text-foreground text-balance sm:text-5xl">
          {article.title}
        </h1>

        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          {article.excerpt}
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-4 border-y border-border py-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{article.author}</span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 text-gold" />
            {formatDate(article.publishedAt ?? article.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-4 text-ember" />
            {minutes} min read
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={copyLink}
            className="ml-auto rounded-full"
          >
            {copied ? (
              <Check className="size-4 text-sage" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>

        {article.cover && (
          <MediaThumb
            src={article.cover}
            alt={article.title}
            category={article.category}
            className="mt-8 aspect-[3/2] rounded-3xl border border-border"
          />
        )}

        {/* Body — 72ch comfortable reading column */}
        <div className="article-prose mt-10">
          <Markdown content={article.content} />
        </div>

        {article.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
            {article.tags.map((tag) => (
              <TagPill key={tag} name={tag} />
            ))}
          </div>
        )}
      </article>

      {(related?.length ?? 0) > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeading eyebrow="Keep reading" title="Related articles" />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related!.map((item) => (
              <ArticleCard key={item._id} article={item} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
