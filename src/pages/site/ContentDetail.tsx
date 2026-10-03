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
  Link2,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaThumb } from "@/components/site/MediaThumb";
import { ContentCard } from "@/components/site/ContentCard";
import { EmptyState } from "@/components/site/EmptyState";
import { SectionHeading } from "@/components/site/SectionHeading";
import { TagPill } from "@/components/site/TagPill";
import { formatDate } from "@/lib/format";
import { toneForCategory } from "@/lib/constants";
import { usePageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export default function ContentDetail() {
  const { id = "" } = useParams();
  const post = useQuery(api.posts.getPostById, { id });
  const latest = useQuery(api.posts.listLatestPosts);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  usePageMeta(post?.title, post?.excerpt);

  useEffect(() => {
    setPlaying(false);
  }, [id]);

  const related = (latest ?? []).filter((item) => item._id !== id).slice(0, 3);

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

  if (post === null) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-36 pb-24 text-center">
        <EmptyState
          icon={Link2}
          title="This video isn't available"
          description="It may have been unpublished or the link is incorrect."
          action={
            <Link
              to="/content"
              className="inline-flex items-center gap-2 rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              <ArrowLeft className="size-4" />
              Back to content
            </Link>
          }
        />
      </div>
    );
  }

  if (post === undefined) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 pt-36 pb-24">
        <Skeleton className="aspect-video rounded-3xl" />
        <Skeleton className="mt-8 h-9 w-2/3" />
        <Skeleton className="mt-4 h-4 w-1/3" />
        <div className="mt-8 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    );
  }

  const category = post.categories[0];
  const paragraphs = post.description.split(/\n{2,}/).filter((p) => p.trim());

  return (
    <>
      <article className="mx-auto w-full max-w-5xl px-4 pt-28 sm:px-6 sm:pt-32">
        <Link
          to="/content"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-ember"
        >
          <ArrowLeft className="size-4" />
          All content
        </Link>

        {/* Player */}
        <div className="group relative mt-6">
          {post.youtubeId && playing ? (
            <iframe
              className="aspect-video w-full rounded-3xl border border-border shadow-[0_30px_80px_-45px_rgba(0,0,0,0.9)]"
              src={`https://www.youtube-nocookie.com/embed/${post.youtubeId}?autoplay=1&rel=0`}
              title={post.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button
              onClick={() => post.youtubeId && setPlaying(true)}
              disabled={!post.youtubeId}
              aria-label={post.youtubeId ? `Play ${post.title}` : post.title}
              className="block w-full cursor-pointer disabled:cursor-default"
            >
              <MediaThumb
                src={post.thumbnail}
                youtubeId={post.youtubeId}
                alt={post.title}
                category={category}
                className="aspect-video rounded-3xl border border-border shadow-[0_30px_80px_-45px_rgba(0,0,0,0.9)]"
              >
                {post.youtubeId && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
                    <span className="flex size-16 items-center justify-center rounded-full bg-background/85 text-ember shadow-xl transition-transform duration-500 group-hover:scale-110">
                      <Play className="size-6 fill-current ml-0.5" />
                    </span>
                  </span>
                )}
              </MediaThumb>
            </button>
          )}
        </div>

        {/* Meta */}
        <div className="mt-9">
          <div className="flex flex-wrap items-center gap-2">
            {post.categories.map((c) => (
              <span
                key={c}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase",
                  toneForCategory(c),
                )}
              >
                {c}
              </span>
            ))}
            {post.featured && (
              <span className="rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase text-gold">
                Featured
              </span>
            )}
          </div>

          <h1 className="font-display mt-5 text-3xl leading-[1.12] font-semibold tracking-tight text-foreground text-balance sm:text-5xl">
            {post.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 text-ember" />
              {formatDate(post.publishedAt ?? post.createdAt)}
            </span>
            {post.duration && (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-4 text-gold" />
                {post.duration}
              </span>
            )}
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
        </div>

        {/* Body */}
        <div className="mt-10 border-t border-border pt-8">
          <p className="font-display text-xl leading-relaxed text-foreground">
            {post.excerpt}
          </p>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-muted-foreground">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {post.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <TagPill key={tag} name={tag} />
              ))}
            </div>
          )}
        </div>

        {post.youtubeUrl && (
          <div className="mt-8">
            <a
              href={post.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-ember/50 hover:text-ember"
            >
              Watch on YouTube
              <Play className="size-4" />
            </a>
          </div>
        )}
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeading eyebrow="Keep watching" title="Related content" />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ContentCard key={item._id} post={item} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
