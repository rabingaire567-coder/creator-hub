import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Palette, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminPageHeader,
  confirmAction,
  runAction,
} from "@/admin/shared";
import { slugify, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type TagDoc = Doc<"tags">;

function TagEditor({
  tag,
  onOpenChange,
}: {
  tag: TagDoc | null;
  onOpenChange: (open: boolean) => void;
}) {
  const createTag = useMutation(api.tags.createTag);
  const renameTag = useMutation(api.tags.renameTag);
  const [name, setName] = useState(tag?.name ?? "");
  const [slug, setSlug] = useState(tag?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(tag?.slug));
  const [color, setColor] = useState(tag?.color ?? "#E0703A");
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const finalName = name.trim();
    if (!finalName) {
      toast.error("Tag name is required.");
      return;
    }
    const finalSlug = slugTouched ? slug : slugify(finalName);
    setSaving(true);
    const ok = await runAction(
      () =>
        tag
          ? renameTag({
              id: tag._id,
              name: finalName,
              slug: finalSlug,
              color,
            })
          : createTag({ name: finalName, slug: finalSlug, color }),
      tag ? "Tag updated." : "Tag created.",
      toast,
    );
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display">
          {tag ? "Edit tag" : "New tag"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="tag-name">Name</Label>
          <Input
            id="tag-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="e.g. Documentary"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tag-slug">Slug</Label>
          <Input
            id="tag-slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            placeholder="documentary"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tag-color" className="flex items-center gap-2">
            <Palette className="size-4" /> Colour
          </Label>
          <div className="flex items-center gap-3">
            <input
              id="tag-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent"
            />
            <span className="text-sm text-muted-foreground">{color}</span>
            <span
              className="rounded-full border px-3 py-1 text-xs font-semibold"
              style={{ color, borderColor: `${color}66`, background: `${color}22` }}
            >
              {name || "preview"}
            </span>
          </div>
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
            {saving ? "Saving…" : tag ? "Save changes" : "Create tag"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

/** Admin screen for the tag taxonomy used across content and articles. */
export default function AdminTags() {
  const tags = useQuery(api.tags.listTags);
  const setTagEnabled = useMutation(api.tags.setTagEnabled);
  const deleteTag = useMutation(api.tags.deleteTag);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<TagDoc | null>(null);

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (tag: TagDoc) => {
    setEditing(tag);
    setEditorOpen(true);
  };

  const handleDelete = async (tag: TagDoc) => {
    if (
      !confirmAction(
        `Delete the tag “${tag.name}”? Existing content keeps its own copy.`,
      )
    )
      return;
    await runAction(() => deleteTag({ id: tag._id }), "Tag deleted.", toast);
  };

  return (
    <div>
      <AdminPageHeader
        title="Tags"
        description="Reusable labels for content and articles. Colour them for instant recognition."
        actions={
          <Button onClick={openNew} className="rounded-full">
            <Plus className="size-4" />
            New tag
          </Button>
        }
      />

      {tags === undefined ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : tags.length === 0 ? (
        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No tags yet — create one to start labelling your work.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag) => {
            const color = tag.color ?? "#E0703A";
            const enabled = tag.enabled !== false;
            return (
              <Card
                key={tag._id}
                className={cn(
                  "border-border/70 bg-card/60 transition-opacity",
                  !enabled && "opacity-55",
                )}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <span
                    className="size-9 shrink-0 rounded-full border"
                    style={{
                      background: `${color}33`,
                      borderColor: `${color}80`,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{tag.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      /tag/{tag.slug} · {formatDate(tag.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) =>
                        runAction(
                          () =>
                            setTagEnabled({ id: tag._id, enabled: checked }),
                          checked ? "Tag enabled." : "Tag disabled.",
                          toast,
                        )
                      }
                      aria-label="Toggle tag"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title="Edit"
                      onClick={() => openEdit(tag)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      title="Delete"
                      onClick={() => handleDelete(tag)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        {editorOpen && (
          <TagEditor
            key={editing?._id ?? "new"}
            tag={editing}
            onOpenChange={setEditorOpen}
          />
        )}
      </Dialog>
    </div>
  );
}
