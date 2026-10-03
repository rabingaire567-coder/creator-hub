import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPageHeader, StatusPill, confirmAction, runAction } from "@/admin/shared";
import { CONTENT_CATEGORIES } from "@/lib/constants";
import { formatDate, readingTime, slugify, truncate } from "@/lib/format";
import { cn } from "@/lib/utils";

type ArticleDoc = Doc<"articles">;

interface ArticleFormValues {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover: string;
  category: string;
  tags: string;
  author: string;
  featured: boolean;
  published: boolean;
}

function fromArticle(article: ArticleDoc | null): ArticleFormValues {
  return {
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    excerpt: article?.excerpt ?? "",
    content: article?.content ?? "",
    cover: article?.cover ?? "",
    category: article?.category ?? CONTENT_CATEGORIES[0],
    tags: (article?.tags ?? []).join(", "),
    author: article?.author ?? "Rabin Gaire",
    featured: article?.featured ?? false,
    published: article?.published ?? false,
  };
}

function ArticleEditor({
  article,
  onOpenChange,
}: {
  article: ArticleDoc | null;
  onOpenChange: (open: boolean) => void;
}) {
  const createArticle = useMutation(api.articles.createArticle);
  const updateArticle = useMutation(api.articles.updateArticle);
  const [form, setForm] = useState<ArticleFormValues>(() =>
    fromArticle(article),
  );
  const [slugTouched, setSlugTouched] = useState(Boolean(article?.slug));
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ArticleFormValues>(
    key: K,
    value: ArticleFormValues[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const slug = slugTouched ? form.slug : slugify(form.title);
    if (!form.title.trim() || !slug || !form.excerpt.trim()) {
      toast.error("Title, slug and excerpt are required.");
      return;
    }
    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const payload = {
      title: form.title.trim(),
      slug,
      excerpt: form.excerpt.trim(),
      content: form.content,
      cover: form.cover.trim() || undefined,
      category: form.category,
      tags,
      author: form.author.trim() || "Rabin Gaire",
      readingTime: readingTime(form.content),
      featured: form.featured,
      published: form.published,
    };
    setSaving(true);
    const ok = await runAction(
      () =>
        article
          ? updateArticle({ id: article._id, patch: payload })
          : createArticle(payload),
      article ? "Article updated." : "Article created.",
      toast,
    );
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle className="font-display">
          {article ? "Edit article" : "New article"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="art-title">Title</Label>
          <Input
            id="art-title"
            value={form.title}
            onChange={(e) => {
              set("title", e.target.value);
              if (!slugTouched) set("slug", slugify(e.target.value));
            }}
            placeholder="Why explanations matter more than ever"
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="art-slug">Slug</Label>
            <Input
              id="art-slug"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value));
              }}
              placeholder="why-explanations-matter"
            />
            <p className="text-xs text-muted-foreground">
              /articles/{slugify(form.title) || "your-slug"}
            </p>
          </div>
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select
              value={form.category}
              onValueChange={(value) => set("category", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="art-excerpt">Excerpt</Label>
          <Textarea
            id="art-excerpt"
            rows={2}
            value={form.excerpt}
            onChange={(e) => set("excerpt", e.target.value)}
            placeholder="Short summary shown on cards and meta descriptions"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="art-content">Content (plain text / markdown)</Label>
          <Textarea
            id="art-content"
            rows={12}
            value={form.content}
            onChange={(e) => set("content", e.target.value)}
            placeholder={"## Heading\n\nWrite your story…"}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Reading time (~{readingTime(form.content)} min) is calculated
            automatically. {form.content.trim().split(/\s+/).filter(Boolean).length}{" "}
            words.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="art-cover">Cover image URL</Label>
            <Input
              id="art-cover"
              value={form.cover}
              onChange={(e) => set("cover", e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="art-author">Author</Label>
            <Input
              id="art-author"
              value={form.author}
              onChange={(e) => set("author", e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="art-tags">Tags</Label>
          <Input
            id="art-tags"
            value={form.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="comma separated: learning, nepal, technology"
          />
        </div>
        <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border/70 bg-background/40 px-4 py-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Switch
              checked={form.published}
              onCheckedChange={(checked) => set("published", checked)}
            />
            Published
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <Switch
              checked={form.featured}
              onCheckedChange={(checked) => set("featured", checked)}
            />
            Featured
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="rounded-full">
            {saving ? "Saving…" : article ? "Save changes" : "Create article"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

/** Admin screen for long-form articles at /articles. */
export default function AdminArticles() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ArticleDoc | null>(null);

  const articles = useQuery(api.articles.listArticles, {
    includeDrafts: true,
    filter: search.trim() || undefined,
    page,
  });
  const setPublished = useMutation(api.articles.setArticlePublished);
  const setFeatured = useMutation(api.articles.setArticleFeatured);
  const deleteArticle = useMutation(api.articles.deleteArticle);

  const items = articles?.items ?? [];
  const total = articles?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (article: ArticleDoc) => {
    setEditing(article);
    setEditorOpen(true);
  };

  const handleDelete = async (article: ArticleDoc) => {
    if (!confirmAction(`Delete “${article.title}”? This cannot be undone.`))
      return;
    await runAction(
      () => deleteArticle({ id: article._id }),
      "Article deleted.",
      toast,
    );
  };

  return (
    <div>
      <AdminPageHeader
        title="Articles"
        description="Editorial writing published under /articles."
        actions={
          <Button onClick={openNew} className="rounded-full">
            <Plus className="size-4" />
            New article
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search articles…"
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">{total} articles</span>
      </div>

      <Card className="border-border/70 bg-card/60">
        <CardContent className="p-0">
          {articles === undefined ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No articles yet. Write your first one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Category
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((article) => (
                  <TableRow key={article._id} className="border-border/50">
                    <TableCell className="max-w-sm">
                      <div className="flex items-center gap-2">
                        {article.featured && (
                          <Star className="size-3.5 shrink-0 fill-gold text-gold" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium">{article.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            /articles/{article.slug} ·{" "}
                            {truncate(article.excerpt, 60)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {article.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        status={article.published ? "published" : "draft"}
                      />
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {formatDate(article.publishedAt ?? article.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title={
                            article.published ? "Unpublish" : "Publish"
                          }
                          onClick={() =>
                            runAction(
                              () =>
                                setPublished({
                                  id: article._id,
                                  published: !article.published,
                                }),
                              article.published
                                ? "Moved back to drafts."
                                : "Published.",
                              toast,
                            )
                          }
                        >
                          {article.published ? (
                            <EyeIcon className="size-4" />
                          ) : (
                            <EyeOffIcon className="size-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Toggle featured"
                          onClick={() =>
                            runAction(
                              () =>
                                setFeatured({
                                  id: article._id,
                                  featured: !article.featured,
                                }),
                              article.featured
                                ? "Removed from featured."
                                : "Featured.",
                              toast,
                            )
                          }
                        >
                          <Star
                            className={cn(
                              "size-4",
                              article.featured
                                ? "fill-gold text-gold"
                                : "text-muted-foreground",
                            )}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Edit"
                          onClick={() => openEdit(article)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => handleDelete(article)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        {editorOpen && (
          <ArticleEditor
            key={editing?._id ?? "new"}
            article={editing}
            onOpenChange={setEditorOpen}
          />
        )}
      </Dialog>
    </div>
  );
}
