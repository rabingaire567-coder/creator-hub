import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal } from "@/components/site/Reveal";
import { formatDate, truncate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Doc } from "@/convex/_generated/dataModel";

interface SaveTarget {
  contentId: string;
  kind: string;
  title: string;
  subtitle?: string;
  href: string;
  thumbnail?: string;
}

function SaveButton({
  saved,
  target,
}: {
  saved: boolean;
  target: SaveTarget;
}) {
  const toggle = useMutation(api.members.toggleSavedContent);
  return (
    <Button
      size="sm"
      variant={saved ? "default" : "outline"}
      className={cn(
        "shrink-0 rounded-full",
        saved && "bg-ember text-white hover:brightness-110",
      )}
      onClick={async () => {
        try {
          const result = await toggle(target);
          toast.success(result.saved ? "Saved for later." : "Removed from saved.");
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Something went wrong.",
          );
        }
      }}
    >
      {saved ? (
        <BookmarkCheck className="size-4" />
      ) : (
        <Bookmark className="size-4" />
      )}
      {saved ? "Saved" : "Save"}
    </Button>
  );
}

function BrowseRow({
  savedIds,
  href,
  title,
  subtitle,
  target,
  thumb,
}: {
  savedIds: Set<string>;
  href: string;
  title: string;
  subtitle?: string;
  target: SaveTarget;
  thumb?: string;
}) {
  const saved = savedIds.has(target.contentId);
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background/40 p-3 transition-colors hover:border-ember/30">
      {thumb ? (
        <img
          src={thumb}
          alt=""
          className="size-14 shrink-0 rounded-xl object-cover"
          loading="lazy"
        />
      ) : (
        <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-ember/10">
          <Bookmark className="size-5 text-ember" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <Link
          to={href}
          className="line-clamp-1 text-sm font-semibold text-foreground hover:text-ember"
        >
          {title}
        </Link>
        {subtitle && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      <SaveButton saved={saved} target={target} />
    </div>
  );
}

/** Saved content: the member's bookmarks plus a browser to add more. */
export default function MemberSaved() {
  const saved = useQuery(api.members.listSavedContent);
  const videos = useQuery(api.posts.listLatestVideos);
  const articles = useQuery(api.articles.listArticles, { page: 1 });
  const projects = useQuery(api.projects.listProjects, { page: 1 });

  const savedIds = new Set((saved ?? []).map((item) => item.contentId));

  return (
    <Reveal>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Saved content
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep the videos, articles and projects you want to come back to.
          </p>
        </div>

        {/* Saved list */}
        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-5">
            {saved === undefined ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : saved.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center px-4 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-ember/10">
                  <Bookmark className="size-5 text-ember" />
                </span>
                <p className="mt-3 font-display text-base font-semibold text-foreground">
                  Nothing saved yet
                </p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Browse the library below and press Save to build your
                  personal list.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {saved.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background/40 p-3"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                      <Bookmark className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={item.href}
                        className="line-clamp-1 text-sm font-semibold text-foreground hover:text-ember"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-muted-foreground capitalize">
                        {item.kind}
                        {item.createdAt ? ` · saved ${formatDate(item.createdAt)}` : ""}
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="shrink-0 rounded-full text-muted-foreground"
                    >
                      <Link to={item.href} aria-label="Open">
                        <ExternalLink className="size-4" />
                      </Link>
                    </Button>
                    <SaveButton
                      saved
                      target={{
                        contentId: item.contentId,
                        kind: item.kind,
                        title: item.title,
                        subtitle: item.subtitle,
                        href: item.href,
                        thumbnail: item.thumbnail,
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Browse to save */}
        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-5">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Browse the library
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Save anything from the latest content.
            </p>
            <Tabs defaultValue="videos" className="mt-4">
              <TabsList>
                <TabsTrigger value="videos">Videos</TabsTrigger>
                <TabsTrigger value="articles">Articles</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
              </TabsList>

              <TabsContent value="videos" className="mt-4 space-y-3">
                {videos === undefined ? (
                  <Skeleton className="h-16 w-full" />
                ) : videos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No videos yet.</p>
                ) : (
                  videos.map((post: Doc<"posts">) => (
                    <BrowseRow
                      key={post._id}
                      savedIds={savedIds}
                      href={`/content/${post._id}`}
                      title={post.title}
                      subtitle={truncate(post.excerpt, 90)}
                      thumb={
                        post.thumbnail ??
                        (post.youtubeId
                          ? `https://i.ytimg.com/vi/${post.youtubeId}/hqdefault.jpg`
                          : undefined)
                      }
                      target={{
                        contentId: post._id,
                        kind: "video",
                        title: post.title,
                        subtitle: post.excerpt,
                        href: `/content/${post._id}`,
                        thumbnail: post.thumbnail,
                      }}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="articles" className="mt-4 space-y-3">
                {articles === undefined ? (
                  <Skeleton className="h-16 w-full" />
                ) : articles.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No articles yet.
                  </p>
                ) : (
                  articles.items.map((article) => (
                    <BrowseRow
                      key={article._id}
                      savedIds={savedIds}
                      href={`/articles/${article.slug}`}
                      title={article.title}
                      subtitle={truncate(article.excerpt, 90)}
                      thumb={article.cover}
                      target={{
                        contentId: article._id,
                        kind: "article",
                        title: article.title,
                        subtitle: article.excerpt,
                        href: `/articles/${article.slug}`,
                        thumbnail: article.cover,
                      }}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="projects" className="mt-4 space-y-3">
                {projects === undefined ? (
                  <Skeleton className="h-16 w-full" />
                ) : projects.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No projects yet.
                  </p>
                ) : (
                  projects.items.map((project) => (
                    <BrowseRow
                      key={project._id}
                      savedIds={savedIds}
                      href={`/projects/${project._id}`}
                      title={project.name}
                      subtitle={truncate(project.description, 90)}
                      thumb={project.thumbnail}
                      target={{
                        contentId: project._id,
                        kind: "project",
                        title: project.name,
                        subtitle: project.description,
                        href: `/projects/${project._id}`,
                        thumbnail: project.thumbnail,
                      }}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Reveal>
  );
}
