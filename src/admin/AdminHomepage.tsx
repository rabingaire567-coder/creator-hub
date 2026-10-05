import { useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { SiteSettings } from "@/convex/schema";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Eye, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AdminPageHeader, runAction } from "@/admin/shared";
import {
  DEFAULT_STATS,
  formatDate,
  parseJsonArray,
  type Stat,
  youtubeThumb,
} from "@/lib/format";

interface AboutSection {
  title: string;
  body: string;
}

interface TimelineItem {
  label: string;
  note: string;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Mirrors the server cap — the data URL lives inside a Convex document. */
const MAX_IMAGE_BYTES = 600 * 1024;
const MAX_IMAGE_DIMENSION = 1920;
/**
 * Convex documents are capped at 1 MiB. The settings row holds both the
 * hero image and the creator photo, so the two share that budget.
 */
const MAX_SETTINGS_DOC_BYTES = 1024 * 1024;
/** Room reserved for the rest of the settings row (copy, JSON, ids). */
const SETTINGS_DOC_RESERVE = 64 * 1024;
/** Below this there is no sensible room left for a second image. */
const MIN_IMAGE_BYTES = 100 * 1024;

function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return 0;
  return Math.floor(((dataUrl.length - comma - 1) * 3) / 4);
}

/**
 * Re-encodes a picked file as a JPEG data URL small enough to store in a
 * Convex document. The same data URL is used for the preview and for saving,
 * so what the admin sees is exactly what visitors get — no blob URLs or
 * temporary references.
 */
async function fileToHeroDataUrl(
  file: File,
  maxBytes: number = MAX_IMAGE_BYTES,
): Promise<{ dataUrl: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    let width = Math.max(1, Math.round(bitmap.width * scale));
    let height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Image processing is not supported in this browser.");
    }

    for (let pass = 0; pass < 3; pass++) {
      canvas.width = width;
      canvas.height = height;
      // Flatten transparency so the picture doesn't render on black.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(bitmap, 0, 0, width, height);
      for (const quality of [0.85, 0.7, 0.55, 0.45]) {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        if (dataUrlByteLength(dataUrl) <= maxBytes) {
          return { dataUrl, mimeType: "image/jpeg" };
        }
      }
      width = Math.max(1, Math.round(width * 0.6));
      height = Math.max(1, Math.round(height * 0.6));
    }
    throw new Error(
      "Couldn't compress that image small enough — try a smaller picture.",
    );
  } finally {
    bitmap.close();
  }
}

function SectionCard({
  title,
  description,
  onSave,
  saving,
  children,
}: {
  title: string;
  description?: string;
  onSave: () => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-card/60">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="font-display text-base">{title}</CardTitle>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving}
            className="rounded-full"
          >
            {saving ? "Saving…" : "Save section"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function ArrayEditor<T extends object>({
  items,
  onChange,
  fields,
  emptyItem,
  addLabel,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  fields: Array<{ key: keyof T & string; label: string; textarea?: boolean }>;
  emptyItem: T;
  addLabel: string;
}) {
  const update = (index: number, key: keyof T & string, value: string) =>
    onChange(
      items.map((item, i) =>
        i === index ? ({ ...item, [key]: value } as T) : item,
      ),
    );

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={index}
          className="rounded-xl border border-border/60 bg-background/40 p-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              #{index + 1}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              title="Remove"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
          <div className="grid gap-3">
            {fields.map((field) => (
              <div key={field.key} className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  {field.label}
                </Label>
                {field.textarea ? (
                  <Textarea
                    rows={3}
                    value={String(item[field.key] ?? "")}
                    onChange={(e) => update(index, field.key, e.target.value)}
                  />
                ) : (
                  <Input
                    value={String(item[field.key] ?? "")}
                    onChange={(e) => update(index, field.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="rounded-full"
        onClick={() => onChange([...items, { ...emptyItem }])}
      >
        <Plus className="size-4" />
        {addLabel}
      </Button>
    </div>
  );
}

/** Homepage CMS: everything above and below the fold on `/`. */
function HomepageForm({
  settings,
}: {
  settings: SiteSettings;
}) {
  const upsert = useMutation(api.site.upsertSiteSettings);
  const uploadImage = useMutation(api.site.uploadHomepageImage);
  const projects = useQuery(api.projects.listProjects, { page: 1 });
  const latestVideos = useQuery(api.posts.listLatestVideos);

  const [hero, setHero] = useState({
    heroHeading: settings.heroHeading ?? "",
    heroSubtext: settings.heroSubtext ?? "",
    heroCtaPrimary: settings.heroCtaPrimary ?? "",
    heroCtaPrimaryHref: settings.heroCtaPrimaryHref ?? "",
    heroCtaSecondary: settings.heroCtaSecondary ?? "",
    heroCtaSecondaryHref: settings.heroCtaSecondaryHref ?? "",
    heroImage: settings.heroImage ?? "",
  });
  // Creator introduction — the photo + copy at the very top of `/`.
  const [creator, setCreator] = useState({
    creatorPhoto: settings.creatorPhoto ?? "",
    creatorName: settings.creatorName ?? "",
    creatorTagline: settings.creatorTagline ?? "",
    creatorIntro: settings.creatorIntro ?? "",
    creatorCtaLabel: settings.creatorCtaLabel ?? "",
    creatorCtaHref: settings.creatorCtaHref ?? "",
    creatorYoutube: settings.creatorYoutube ?? "",
  });
  const [introduction, setIntroduction] = useState(settings.introduction ?? "");
  const [stats, setStats] = useState<Stat[]>(
    parseJsonArray<Stat>(settings.stats, DEFAULT_STATS),
  );
  const [aboutSections, setAboutSections] = useState<AboutSection[]>(
    parseJsonArray<AboutSection>(settings.aboutSections, []),
  );
  const [timeline, setTimeline] = useState<TimelineItem[]>(
    parseJsonArray<TimelineItem>(settings.timeline, []),
  );
  const [currentProject, setCurrentProject] = useState(
    settings.currentProject ?? "",
  );
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const save = async (key: string, patch: Record<string, unknown>) => {
    setSavingSection(key);
    const ok = await runAction(
      () => upsert({ patch }),
      "Homepage updated.",
      toast,
    );
    setSavingSection(null);
    return ok;
  };

  /**
   * Uploads a picked file and hands the stored data URL to `apply`.
   * `otherImageDataUrl` returns the image already stored on the settings row
   * (hero vs creator photo) so both stay inside Convex's 1 MiB document cap.
   */
  const pickImageFor =
    (apply: (dataUrl: string) => void, otherImageDataUrl: () => string) =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // reset so the same file can be re-picked
      if (!file) return;
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.error(
          "Unsupported file type. Only JPG, PNG and WebP are allowed.",
        );
        return;
      }
      const availableRawBytes = Math.floor(
        ((MAX_SETTINGS_DOC_BYTES -
          SETTINGS_DOC_RESERVE -
          otherImageDataUrl().length) *
          3) /
          4,
      );
      const maxBytes = Math.min(MAX_IMAGE_BYTES, availableRawBytes);
      if (maxBytes < MIN_IMAGE_BYTES) {
        toast.error(
          "The other homepage image leaves no room — remove it before uploading this one.",
        );
        return;
      }
      setUploadingImage(true);
      try {
        const { dataUrl, mimeType } = await fileToHeroDataUrl(file, maxBytes);
        const ok = await runAction(
          () => uploadImage({ name: file.name, mimeType, dataUrl }),
          "Image uploaded — press “Save section” to apply it.",
          toast,
        );
        if (ok) {
          apply(dataUrl);
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Couldn't read that image file.",
        );
      } finally {
        setUploadingImage(false);
      }
    };

  const pickImage = pickImageFor(
    (dataUrl) => setHero((prev) => ({ ...prev, heroImage: dataUrl })),
    () => creator.creatorPhoto,
  );
  const pickPhoto = pickImageFor(
    (dataUrl) => setCreator((prev) => ({ ...prev, creatorPhoto: dataUrl })),
    () => hero.heroImage,
  );

  const projectOptions = projects?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Creator introduction */}
      <SectionCard
        title="Creator introduction"
        description="The photo, name and copy shown in the intro at the very top of the homepage."
        saving={savingSection === "creator"}
        onSave={() => save("creator", creator)}
      >
        <div className="grid gap-4 lg:grid-cols-[260px_1fr] lg:items-start">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Creator photo
            </Label>
            <div className="rounded-xl border border-border/60 bg-background/40 p-3">
              {creator.creatorPhoto ? (
                <div className="mb-3 overflow-hidden rounded-lg border border-border/60">
                  <img
                    src={creator.creatorPhoto}
                    alt="Creator photo preview"
                    className="h-56 w-full object-cover"
                  />
                </div>
              ) : (
                <div className="mb-3 flex h-32 items-center justify-center rounded-lg border border-dashed border-border/70 px-4 text-center text-xs text-muted-foreground">
                  No photo yet — the homepage falls back to the hero image or
                  your initials.
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={pickPhoto}
                />
                <Button
                  size="sm"
                  className="rounded-full"
                  disabled={uploadingImage}
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Upload className="size-3.5" />
                  {uploadingImage
                    ? "Uploading…"
                    : creator.creatorPhoto
                      ? "Replace photo"
                      : "Pick photo"}
                </Button>
                {creator.creatorPhoto && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-destructive hover:text-destructive"
                    disabled={uploadingImage}
                    onClick={() =>
                      setCreator((prev) => ({ ...prev, creatorPhoto: "" }))
                    }
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                value={creator.creatorName}
                onChange={(e) =>
                  setCreator({ ...creator, creatorName: e.target.value })
                }
                placeholder="Rabin Gaire"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Tagline</Label>
              <Input
                value={creator.creatorTagline}
                onChange={(e) =>
                  setCreator({ ...creator, creatorTagline: e.target.value })
                }
                placeholder="Exploring ideas, technology, Nepal and the stories behind them."
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Short intro
              </Label>
              <Textarea
                rows={3}
                value={creator.creatorIntro}
                onChange={(e) =>
                  setCreator({ ...creator, creatorIntro: e.target.value })
                }
                placeholder="A sentence or two about who you are and what you make."
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  CTA label
                </Label>
                <Input
                  value={creator.creatorCtaLabel}
                  onChange={(e) =>
                    setCreator({ ...creator, creatorCtaLabel: e.target.value })
                  }
                  placeholder="Explore My Work"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  CTA link
                </Label>
                <Input
                  value={creator.creatorCtaHref}
                  onChange={(e) =>
                    setCreator({ ...creator, creatorCtaHref: e.target.value })
                  }
                  placeholder="/projects"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">
                YouTube link
              </Label>
              <Input
                value={creator.creatorYoutube}
                onChange={(e) =>
                  setCreator({ ...creator, creatorYoutube: e.target.value })
                }
                placeholder="https://youtube.com/@yourchannel"
              />
              <p className="text-[11px] text-muted-foreground">
                Powers the YouTube button next to the CTA. When empty it falls
                back to your YouTube social link, then youtube.com.
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Latest videos (read-only preview of the homepage grid) */}
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="font-display text-base">
                Latest videos
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                The homepage grid shows the newest published videos
                automatically — manage them under Content.
              </p>
            </div>
            <a
              href="/admin/content"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-ember/50 hover:text-ember"
            >
              <Eye className="size-3.5" />
              Manage in Content
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {latestVideos === undefined ? (
            <Skeleton className="h-20 w-full" />
          ) : latestVideos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No published videos yet — publish one from Content and it shows
              up here without any extra steps.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {latestVideos.map((post) => {
                const thumb =
                  post.thumbnail || youtubeThumb(post.youtubeId) || "";
                return (
                  <a
                    key={post._id}
                    href={`/content/${post._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-2 transition-colors hover:border-ember/40"
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        className="h-14 w-24 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] text-muted-foreground">
                        No thumb
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {post.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {formatDate(post.publishedAt ?? post.createdAt)}
                      </span>
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hero */}
      <SectionCard
        title="Hero"
        description="Supporting copy for the creator intro — eyebrow label, tagline fallback and backup photo."
        saving={savingSection === "hero"}
        onSave={() => save("hero", hero)}
      >
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Heading</Label>
            <Textarea
              rows={2}
              value={hero.heroHeading}
              onChange={(e) =>
                setHero({ ...hero, heroHeading: e.target.value })
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Eyebrow / subtext
            </Label>
            <Input
              value={hero.heroSubtext}
              onChange={(e) =>
                setHero({ ...hero, heroSubtext: e.target.value })
              }
              placeholder="Creator • Storyteller • Developer"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Primary CTA label
              </Label>
              <Input
                value={hero.heroCtaPrimary}
                onChange={(e) =>
                  setHero({ ...hero, heroCtaPrimary: e.target.value })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Primary CTA link
              </Label>
              <Input
                value={hero.heroCtaPrimaryHref}
                onChange={(e) =>
                  setHero({ ...hero, heroCtaPrimaryHref: e.target.value })
                }
                placeholder="/content"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Secondary CTA label
              </Label>
              <Input
                value={hero.heroCtaSecondary}
                onChange={(e) =>
                  setHero({ ...hero, heroCtaSecondary: e.target.value })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">
                Secondary CTA link
              </Label>
              <Input
                value={hero.heroCtaSecondaryHref}
                onChange={(e) =>
                  setHero({ ...hero, heroCtaSecondaryHref: e.target.value })
                }
                placeholder="/projects"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Hero image</Label>
            <div className="rounded-xl border border-border/60 bg-background/40 p-3">
              {hero.heroImage ? (
                <div className="mb-3 overflow-hidden rounded-lg border border-border/60">
                  <img
                    src={hero.heroImage}
                    alt="Hero image preview"
                    className="h-40 w-full object-cover"
                  />
                </div>
              ) : (
                <div className="mb-3 flex h-24 items-center justify-center rounded-lg border border-dashed border-border/70 px-4 text-center text-xs text-muted-foreground">
                  No image yet — the hero renders without a picture.
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={pickImage}
                />
                <Button
                  size="sm"
                  className="rounded-full"
                  disabled={uploadingImage}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <Upload className="size-3.5" />
                  {uploadingImage
                    ? "Uploading…"
                    : hero.heroImage
                      ? "Replace image"
                      : "Pick image"}
                </Button>
                {hero.heroImage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-destructive hover:text-destructive"
                    disabled={uploadingImage}
                    onClick={() =>
                      setHero((prev) => ({ ...prev, heroImage: "" }))
                    }
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                )}
                <span className="text-[11px] text-muted-foreground">
                  JPG, PNG or WebP · auto-compressed · applied when you save
                  this section
                </span>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Introduction */}
      <SectionCard
        title="Introduction"
        description="The warm hello paragraph under the hero."
        saving={savingSection === "intro"}
        onSave={() => save("intro", { introduction })}
      >
        <Textarea
          rows={4}
          value={introduction}
          onChange={(e) => setIntroduction(e.target.value)}
        />
      </SectionCard>

      {/* Stats */}
      <SectionCard
        title="Stats"
        description="The counters shown in the social-proof strip."
        saving={savingSection === "stats"}
        onSave={() => save("stats", { stats: JSON.stringify(stats) })}
      >
        <ArrayEditor<Stat>
          items={stats}
          onChange={setStats}
          fields={[
            { key: "label", label: "Label" },
            { key: "value", label: "Value" },
            { key: "suffix", label: "Suffix (e.g. K+)" },
          ]}
          emptyItem={{ label: "", value: "", suffix: "" }}
          addLabel="Add stat"
        />
      </SectionCard>

      {/* About sections */}
      <SectionCard
        title="About sections"
        description="Story blocks on the About page — reorder by editing titles freely."
        saving={savingSection === "about"}
        onSave={() =>
          save("about", { aboutSections: JSON.stringify(aboutSections) })
        }
      >
        <ArrayEditor<AboutSection>
          items={aboutSections}
          onChange={setAboutSections}
          fields={[
            { key: "title", label: "Title" },
            { key: "body", label: "Body", textarea: true },
          ]}
          emptyItem={{ title: "", body: "" }}
          addLabel="Add section"
        />
      </SectionCard>

      {/* Timeline */}
      <SectionCard
        title="Timeline"
        description="The journey strip on the About page."
        saving={savingSection === "timeline"}
        onSave={() => save("timeline", { timeline: JSON.stringify(timeline) })}
      >
        <ArrayEditor<TimelineItem>
          items={timeline}
          onChange={setTimeline}
          fields={[
            { key: "label", label: "Label" },
            { key: "note", label: "Note", textarea: true },
          ]}
          emptyItem={{ label: "", note: "" }}
          addLabel="Add milestone"
        />
      </SectionCard>

      {/* Current project */}
      <SectionCard
        title="Current project"
        description="Pinned to the homepage's “currently building” slot. Leave on auto to feature the project marked Building."
        saving={savingSection === "project"}
        onSave={() => save("project", { currentProject })}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Select value={currentProject} onValueChange={setCurrentProject}>
            <SelectTrigger className="w-full sm:w-96">
              <SelectValue placeholder="Auto (project marked Building)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Auto</SelectItem>
              {projectOptions.map((project) => (
                <SelectItem key={project._id} value={project._id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-ember hover:underline"
          >
            <Eye className="size-3.5" />
            Preview homepage
          </a>
        </div>
      </SectionCard>
    </div>
  );
}

/** Admin screen for homepage content (hero, intro, stats, about, timeline). */
export default function AdminHomepage() {
  const settings = useQuery(api.site.getSiteSettings);

  if (settings === undefined) {
    return (
      <div>
        <AdminPageHeader title="Homepage" description="Loading settings…" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Homepage Settings"
        description="Everything on the front page — edits go live the moment you save."
        actions={
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-ember/50 hover:text-ember"
          >
            <Eye className="size-4" />
            Preview site
          </a>
        }
      />
      <HomepageForm key="homepage" settings={settings} />
    </div>
  );
}
