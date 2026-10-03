import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Star,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatDate, timeAgo, truncate } from "@/lib/format";
import { cn } from "@/lib/utils";

type PostDoc = Doc<"posts">;

interface PostFormValues {
  title: string;
  excerpt: string;
  description: string;
  youtubeUrl: string;
  thumbnail: string;
  duration: string;
  categories: string[];
  tags: string;
  featured: boolean;
  published: boolean;
}

function emptyForm(): PostFormValues {
  return {
    title: "",
    excerpt: "",
    description: "",
    youtubeUrl: "",
    thumbnail: "",
    duration: "",
    categories: [],
    tags: "",
    featured: false,
    published: false,
  };
}

function fromPost(post: PostDoc): PostFormValues {
  return {
    title: post.title,
    excerpt: post.excerpt,
    description: post.description,
    youtubeUrl: post.youtubeUrl ?? "",
    thumbnail: post.thumbnail ?? "",
    duration: post.duration ?? "",
    categories: post.categories ?? [],
    tags: (post.tags ?? []).join(", "),
    featured: post.featured ?? false,
    published: post.published ?? false,
  };
}

function PostEditor({
  post,
  onOpenChange,
}: {
  post: PostDoc | null;
  onOpenChange: (open: boolean) => void;
}) {
  const createPost = useMutation(api.posts.createPost);
  const updatePost = useMutation(api.posts.updatePost);
  const [form, setForm] = useState<PostFormValues>(
    post ? fromPost(post) : emptyForm(),
  );
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleCategory = (category: string) =>
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.excerpt.trim()) {
      toast.error("Title and excerpt are required.");
      return;
    }
    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const payload = {
      title: form.title.trim(),
      excerpt: form.excerpt.trim(),
      description: form.description.trim(),
      youtubeUrl: form.youtubeUrl.trim() || undefined,
      thumbnail: form.thumbnail.trim() || undefined,
      duration: form.duration.trim() || undefined,
      categories: form.categories,
      tags,
      featured: form.featured,
      published: form.published,
    };
    setSaving(true);
    const ok = await runAction(
      () =>
        post ? updatePost({ id: post._id, patch: payload }) : createPost(payload),
      post ? "Content updated." : "Content created.",
      toast,
    );
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-display">
          {post ? "Edit content" : "New content"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="post-title">Title</Label>
          <Input
            id="post-title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. How Nepal is building its tech future"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="post-excerpt">Excerpt</Label>
          <Textarea
            id="post-excerpt"
            rows={2}
            value={form.excerpt}
            onChange={(e) => set("excerpt", e.target.value)}
            placeholder="One or two sentence summary shown on cards"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="post-description">Full description</Label>
          <Textarea
            id="post-description"
            rows={5}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Everything viewers should know — chapters, sources, credits…"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="post-youtube">YouTube URL</Label>
            <Input
              id="post-youtube"
              value={form.youtubeUrl}
              onChange={(e) => set("youtubeUrl", e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
            />
            <p className="text-xs text-muted-foreground">
              The video ID and thumbnail are extracted automatically.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="post-duration">Duration</Label>
            <Input
              id="post-duration"
              value={form.duration}
              onChange={(e) => set("duration", e.target.value)}
              placeholder="12:34"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="post-thumbnail">Custom thumbnail URL (optional)</Label>
          <Input
            id="post-thumbnail"
            value={form.thumbnail}
            onChange={(e) => set("thumbnail", e.target.value)}
            placeholder="https://… (leave empty to use the YouTube thumbnail)"
          />
        </div>

        <div className="grid gap-2">
          <Label>Categories</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CONTENT_CATEGORIES.map((category) => (
              <label
                key={category}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-xs font-medium transition-colors",
                  form.categories.includes(category)
                    ? "border-ember/50 bg-ember/10 text-ember"
                    : "text-muted-foreground hover:border-ember/30",
                )}
              >
                <Checkbox
                  checked={form.categories.includes(category)}
                  onCheckedChange={() => toggleCategory(category)}
                />
                {category}
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="post-tags">Tags</Label>
          <Input
            id="post-tags"
            value={form.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="comma separated: nepal, science, documentary"
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
            Featured on homepage
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
            {saving ? "Saving…" : post ? "Save changes" : "Create content"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

/** Admin screen for videos/Content posts: list, search, edit, publish. */
export default function AdminContent() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PostDoc | null>(null);

  const posts = useQuery(api.posts.listPosts, {
    includeDrafts: true,
    filter: search.trim() || undefined,
    page,
  });
  const setPublished = useMutation(api.posts.setPostPublished);
  const setFeatured = useMutation(api.posts.setPostFeatured);
  const deletePost = useMutation(api.posts.deletePost);

  const items = posts?.items ?? [];
  const total = posts?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (post: PostDoc) => {
    setEditing(post);
    setEditorOpen(true);
  };

  const handleDelete = async (post: PostDoc) => {
    if (!confirmAction(`Delete “${post.title}”? This cannot be undone.`)) return;
    await runAction(() => deletePost({ id: post._id }), "Content deleted.", toast);
  };

  return (
    <div>
      <AdminPageHeader
        title="Content"
        description="Videos and posts that power /content and the homepage."
        actions={
          <Button onClick={openNew} className="rounded-full">
            <Plus className="size-4" />
            New content
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
          placeholder="Search titles, excerpts, categories…"
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">{total} items</span>
      </div>

      <Card className="border-border/70 bg-card/60">
        <CardContent className="p-0">
          {posts === undefined ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nothing here yet. Create your first piece of content to get
              started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Categories
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((post) => (
                  <TableRow key={post._id} className="border-border/50">
                    <TableCell className="max-w-xs">
                      <div className="flex items-center gap-2">
                        {post.featured && (
                          <Star className="size-3.5 shrink-0 fill-gold text-gold" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium">{post.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {truncate(post.excerpt, 80)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(post.categories ?? []).slice(0, 2).map((category) => (
                          <span
                            key={category}
                            className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        status={post.published ? "published" : "draft"}
                      />
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {formatDate(post.updatedAt ?? post.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title={
                            post.published ? "Unpublish" : "Publish"
                          }
                          onClick={() =>
                            runAction(
                              () =>
                                setPublished({
                                  id: post._id,
                                  published: !post.published,
                                }),
                              post.published
                                ? "Moved back to drafts."
                                : "Published.",
                              toast,
                            )
                          }
                        >
                          {post.published ? (
                            <Eye className="size-4" />
                          ) : (
                            <EyeOff className="size-4 text-muted-foreground" />
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
                                  id: post._id,
                                  featured: !post.featured,
                                }),
                              post.featured
                                ? "Removed from featured."
                                : "Added to featured.",
                              toast,
                            )
                          }
                        >
                          <Star
                            className={cn(
                              "size-4",
                              post.featured
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
                          onClick={() => openEdit(post)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => handleDelete(post)}
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
          <PostEditor
            key={editing?._id ?? "new"}
            post={editing}
            onOpenChange={setEditorOpen}
          />
        )}
      </Dialog>

      <p className="mt-6 text-xs text-muted-foreground">
        Last change {timeAgo(items[0]?.updatedAt ?? items[0]?.createdAt)}
      </p>
    </div>
  );
}
