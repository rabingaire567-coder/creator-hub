import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AdminPageHeader,
  confirmAction,
  runAction,
} from "@/admin/shared";
import {
  SOCIAL_PLATFORMS,
  SOCIAL_URL_PLACEHOLDERS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

type SocialDoc = Doc<"socialLinks">;

function SocialEditor({
  link,
  defaultOrder,
  onOpenChange,
}: {
  link: SocialDoc | null;
  defaultOrder: number;
  onOpenChange: (open: boolean) => void;
}) {
  const setSocialLink = useMutation(api.social.setSocialLink);
  const [platform, setPlatform] = useState<string>(
    link?.platform ?? SOCIAL_PLATFORMS[0],
  );
  const [label, setLabel] = useState(link?.label ?? "");
  const [url, setUrl] = useState(link?.url ?? "");
  const [enabled, setEnabled] = useState(link?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!label.trim() || !url.trim()) {
      toast.error("Label and URL are required.");
      return;
    }
    setSaving(true);
    const ok = await runAction(
      () =>
        setSocialLink({
          platform,
          label: label.trim(),
          url: url.trim(),
          enabled,
          order: link?.order ?? defaultOrder,
        }),
      "Social link saved.",
      toast,
    );
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display">
          {link ? "Edit social link" : "Add social link"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-2">
          <Label>Platform</Label>
          <Select
            value={platform}
            onValueChange={(value) => {
              setPlatform(value);
              if (!url.trim() || Object.values(SOCIAL_URL_PLACEHOLDERS).includes(url)) {
                setUrl(SOCIAL_URL_PLACEHOLDERS[value as keyof typeof SOCIAL_URL_PLACEHOLDERS] ?? "");
              }
              if (!label.trim()) setLabel(value);
            }}
            disabled={Boolean(link)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOCIAL_PLATFORMS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {link && (
            <p className="text-xs text-muted-foreground">
              The platform of an existing link can't change — delete and add a
              new one instead.
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="social-label">Label</Label>
          <Input
            id="social-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="YouTube"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="social-url">URL</Label>
          <Input
            id="social-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={
              SOCIAL_URL_PLACEHOLDERS[platform as keyof typeof SOCIAL_URL_PLACEHOLDERS] ??
              "https://…"
            }
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          Visible on the site
        </label>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="rounded-full">
            {saving ? "Saving…" : "Save link"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

/** Admin screen for the social links used in the navbar, footer and homepage. */
export default function AdminSocial() {
  const links = useQuery(api.social.listSocialLinks);
  const deleteSocialLink = useMutation(api.social.deleteSocialLink);
  const reorderSocialLinks = useMutation(api.social.reorderSocialLinks);
  const setSocialLink = useMutation(api.social.setSocialLink);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SocialDoc | null>(null);

  const items = links ?? [];

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (link: SocialDoc) => {
    setEditing(link);
    setEditorOpen(true);
  };

  const handleDelete = async (link: SocialDoc) => {
    if (!confirmAction(`Remove the ${link.platform} link?`)) return;
    await runAction(
      () => deleteSocialLink({ platform: link.platform }),
      "Social link removed.",
      toast,
    );
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    await runAction(
      () =>
        reorderSocialLinks({
          ids: next.map((link) => link._id),
        }),
      "Order updated.",
      toast,
    );
  };

  return (
    <div>
      <AdminPageHeader
        title="Social links"
        description="These power the Follow menu, footer and homepage. Drag order with the arrows."
        actions={
          <Button onClick={openNew} className="rounded-full">
            <Plus className="size-4" />
            Add link
          </Button>
        }
      />

      {items.length === 0 ? (
        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No social links yet — add YouTube, Facebook, Instagram and friends.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((link, index) => (
            <Card
              key={link._id}
              className={cn(
                "border-border/70 bg-card/60",
                link.enabled === false && "opacity-55",
              )}
            >
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="flex flex-col gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    title="Move up"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    title="Move down"
                    disabled={index === items.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {link.label}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {link.platform}
                    </span>
                  </p>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-xs text-ember hover:underline"
                  >
                    {link.url}
                  </a>
                </div>
                <Switch
                  checked={link.enabled !== false}
                  onCheckedChange={(checked) =>
                    runAction(
                      () =>
                        setSocialLink({
                          platform: link.platform,
                          label: link.label,
                          url: link.url,
                          enabled: checked,
                          order: link.order,
                        }),
                      checked ? "Link shown." : "Link hidden.",
                      toast,
                    )
                  }
                />
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    title="Edit"
                    onClick={() => openEdit(link)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    title="Delete"
                    onClick={() => handleDelete(link)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        {editorOpen && (
          <SocialEditor
            key={editing?._id ?? "new"}
            link={editing}
            defaultOrder={items.length}
            onOpenChange={setEditorOpen}
          />
        )}
      </Dialog>
    </div>
  );
}
