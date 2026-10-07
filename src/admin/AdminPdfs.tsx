import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Lock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
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
import {
  AdminPageHeader,
  StatusPill,
  confirmAction,
  runAction,
} from "@/admin/shared";
import { PDF_CATEGORIES } from "@/lib/constants";
import { formatDate, truncate } from "@/lib/format";
import {
  assertPdfFile,
  compressThumbnail,
  formatFileSize,
} from "@/lib/pdf";

type PdfDoc = Doc<"pdfs">;

/** Shape returned by api.pdfs.listPdfs (includes the gated file URL). */
interface PdfListItem {
  _id: PdfDoc["_id"];
  title: string;
  description: string | undefined;
  category: string | undefined;
  visibility: "public" | "members";
  published: boolean;
  publishedAt: number | undefined;
  createdAt: number | undefined;
  fileName: string | undefined;
  fileSize: number | undefined;
  thumbnail: string | undefined;
  locked: boolean;
  pdfUrl: string | null;
}

interface PdfFormValues {
  title: string;
  description: string;
  category: string;
  visibility: "public" | "members";
  /** yyyy-mm-dd — mapped to publishedAt (ms) on save. */
  publishDate: string;
  published: boolean;
  /** Current thumbnail data URL; omitting it clears the thumbnail. */
  thumbnail: string | undefined;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toDateInput(ms?: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromDateInput(value: string): number | undefined {
  if (!value) return undefined;
  const time = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(time) ? undefined : time;
}

function fromPdf(pdf: PdfListItem | null): PdfFormValues {
  return {
    title: pdf?.title ?? "",
    description: pdf?.description ?? "",
    category: pdf?.category ?? PDF_CATEGORIES[0],
    visibility: pdf?.visibility === "members" ? "members" : "public",
    publishDate: toDateInput(pdf?.publishedAt ?? pdf?.createdAt),
    published: pdf?.published ?? false,
    thumbnail: pdf?.thumbnail,
  };
}

/** Posts the file to Convex's short-lived upload URL, returns its storage id. */
async function uploadPdfFile(
  generateUploadUrl: () => Promise<string>,
  file: File,
): Promise<string> {
  const uploadUrl = await generateUploadUrl();
  const response = await fetch(uploadUrl, {
    method: "POST",
    body: file,
    headers: { "Content-Type": "application/pdf" },
  });
  if (!response.ok) {
    throw new Error("The upload failed — please try again.");
  }
  const data = (await response.json()) as { storageId?: string };
  if (!data.storageId) {
    throw new Error("The upload failed — no file id returned.");
  }
  return data.storageId;
}

function PdfEditor({
  pdf,
  onOpenChange,
}: {
  pdf: PdfListItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const createPdf = useMutation(api.pdfs.createPdf);
  const updatePdf = useMutation(api.pdfs.updatePdf);
  const generateUploadUrl = useMutation(api.pdfs.generateUploadUrl);

  const [form, setForm] = useState<PdfFormValues>(() => fromPdf(pdf));
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [thumbBusy, setThumbBusy] = useState(false);

  const set = <K extends keyof PdfFormValues>(
    key: K,
    value: PdfFormValues[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const pickPdfFile = async (file: File | null) => {
    if (!file) {
      setPdfFile(null);
      return;
    }
    try {
      await assertPdfFile(file);
      setPdfFile(file);
    } catch (error) {
      setPdfFile(null);
      toast.error(error instanceof Error ? error.message : "Invalid PDF file.");
    }
  };

  const pickThumbnail = async (file: File | null) => {
    if (!file) return;
    setThumbBusy(true);
    try {
      const dataUrl = await compressThumbnail(file);
      set("thumbnail", dataUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't read that image.",
      );
    } finally {
      setThumbBusy(false);
    }
  };

  const preview = () => {
    if (pdfFile) {
      // Ephemeral preview only — the permanent copy lives in Convex storage.
      const href = URL.createObjectURL(pdfFile);
      const opened = window.open(href, "_blank");
      if (!opened) {
        toast.error("Your browser blocked the preview window.");
      }
      setTimeout(() => URL.revokeObjectURL(href), 60_000);
      return;
    }
    if (pdf?.pdfUrl) {
      window.open(pdf.pdfUrl, "_blank", "noopener,noreferrer");
      return;
    }
    toast.error("Choose a PDF file to preview.");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error("A title is required.");
      return;
    }
    if (!pdf && !pdfFile) {
      toast.error("Choose a PDF file to upload.");
      return;
    }

    setSaving(true);
    try {
      let fileStorageId: string | undefined;
      if (pdfFile) {
        fileStorageId = await uploadPdfFile(generateUploadUrl, pdfFile);
      }
      const publishedAt =
        fromDateInput(form.publishDate) ??
        (form.published ? Date.now() : undefined);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        visibility: form.visibility,
        published: form.published,
        publishedAt,
        fileName: pdfFile?.name ?? pdf?.fileName ?? undefined,
        thumbnail: form.thumbnail,
      };

      if (pdf) {
        await updatePdf({ id: pdf._id, ...payload, fileStorageId });
        toast.success("PDF updated.");
      } else {
        if (!fileStorageId) throw new Error("The upload failed — try again.");
        await createPdf({ ...payload, fileStorageId });
        toast.success("PDF added to the library.");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setSaving(false);
    }
  };

  const currentFileName = pdfFile?.name ?? pdf?.fileName;
  const currentFileSize = pdfFile?.size ?? pdf?.fileSize;

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-display">
          {pdf ? "Edit PDF" : "Add PDF"}
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="pdf-title">Title</Label>
          <Input
            id="pdf-title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. The Creator's Playbook"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="pdf-desc">Short description</Label>
          <Textarea
            id="pdf-desc"
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What's inside this PDF, and who is it for?"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
                {PDF_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Visibility</Label>
            <Select
              value={form.visibility}
              onValueChange={(value) =>
                set("visibility", value as "public" | "members")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="members">
                  Community Members Only
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="pdf-date">Publish date</Label>
            <Input
              id="pdf-date"
              type="date"
              value={form.publishDate}
              onChange={(e) => set("publishDate", e.target.value)}
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch
                checked={form.published}
                onCheckedChange={(checked) => set("published", checked)}
              />
              Published
            </label>
          </div>
        </div>

        {/* ---- PDF file ---- */}
        <div className="grid gap-2">
          <Label htmlFor="pdf-file">
            PDF file {pdf ? "(replace)" : ""}
          </Label>
          <Input
            id="pdf-file"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => void pickPdfFile(e.target.files?.[0] ?? null)}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">
            {currentFileName
              ? `${currentFileName}${
                  currentFileSize ? ` — ${formatFileSize(currentFileSize)}` : ""
                }`
              : "PDF up to 10 MB."}
            {pdfFile ? " New file will replace the current one on save." : ""}
          </p>
        </div>

        {/* ---- Thumbnail ---- */}
        <div className="grid gap-2">
          <Label htmlFor="pdf-thumb">Thumbnail</Label>
          <div className="flex items-center gap-3">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
              {form.thumbnail ? (
                <img
                  src={form.thumbnail}
                  alt="Thumbnail preview"
                  className="size-full object-cover"
                />
              ) : (
                <ImageIcon className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Input
                id="pdf-thumb"
                type="file"
                accept="image/*"
                disabled={thumbBusy}
                onChange={(e) =>
                  void pickThumbnail(e.target.files?.[0] ?? null)
                }
                className="cursor-pointer max-w-[18rem]"
              />
              {form.thumbnail && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 justify-start text-xs text-muted-foreground"
                  onClick={() => set("thumbnail", undefined)}
                >
                  Remove thumbnail
                </Button>
              )}
            </div>
          </div>
          {thumbBusy && (
            <p className="text-xs text-muted-foreground">Processing image…</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/40 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Preview opens the picked file before publishing.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={preview}
          >
            <Eye className="size-4" />
            Preview PDF
          </Button>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving || thumbBusy} className="rounded-full">
            {saving ? "Saving…" : pdf ? "Save changes" : "Add PDF"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

/** Admin screen for the 📄 PDF Library at /admin/pdfs. */
export default function AdminPdfs() {
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PdfListItem | null>(null);

  const pdfs = useQuery(api.pdfs.listPdfs, {
    includeDrafts: true,
    filter: search.trim() || undefined,
  });
  const deletePdf = useMutation(api.pdfs.deletePdf);
  const setPublished = useMutation(api.pdfs.setPdfPublished);

  const items = pdfs?.items ?? [];
  const total = pdfs?.total ?? 0;

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (pdf: PdfListItem) => {
    setEditing(pdf);
    setEditorOpen(true);
  };

  const handleDelete = async (pdf: PdfListItem) => {
    if (!confirmAction(`Delete “${pdf.title}”? This cannot be undone.`))
      return;
    await runAction(
      () => deletePdf({ id: pdf._id }),
      "PDF deleted.",
      toast,
    );
  };

  return (
    <div>
      <AdminPageHeader
        title="📄 PDF Library"
        description="Standalone PDFs shown on /pdfs — separate from articles, videos and projects."
        actions={
          <Button onClick={openNew} className="rounded-full">
            <Plus className="size-4" />
            Add PDF
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search PDFs…"
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">{total} PDFs</span>
      </div>

      <Card className="border-border/70 bg-card/60">
        <CardContent className="p-0">
          {pdfs === undefined ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No PDFs yet. Add your first one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead>PDF</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Category
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Visibility
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Published
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((pdf) => (
                  <TableRow key={pdf._id} className="border-border/50">
                    <TableCell className="max-w-xs">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                          {pdf.thumbnail ? (
                            <img
                              src={pdf.thumbnail}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            <FileText className="size-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{pdf.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {pdf.fileName
                              ? `${pdf.fileName}${
                                  pdf.fileSize
                                    ? ` — ${formatFileSize(pdf.fileSize)}`
                                    : ""
                                }`
                              : truncate(pdf.description ?? "", 60)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {pdf.category || "General"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <VisibilityBadge visibility={pdf.visibility} />
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        status={pdf.published ? "published" : "draft"}
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {formatDate(pdf.publishedAt ?? pdf.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title={pdf.published ? "Unpublish" : "Publish"}
                          onClick={() =>
                            runAction(
                              () =>
                                setPublished({
                                  id: pdf._id,
                                  published: !pdf.published,
                                }),
                              pdf.published
                                ? "Moved back to drafts."
                                : "Published.",
                              toast,
                            )
                          }
                        >
                          {pdf.published ? (
                            <Eye className="size-4" />
                          ) : (
                            <EyeOff className="size-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Edit"
                          onClick={() => openEdit(pdf)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => handleDelete(pdf)}
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

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        {editorOpen && (
          <PdfEditor
            key={editing?._id ?? "new"}
            pdf={editing}
            onOpenChange={setEditorOpen}
          />
        )}
      </Dialog>

      <p className="mt-6 text-xs text-muted-foreground">
        Members-only PDFs ask signed-out visitors to log in or join the
        community; drafts stay visible only in this studio.
      </p>
    </div>
  );
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  if (visibility === "members") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/15 px-2.5 py-0.5 text-[11px] font-semibold text-gold">
        <Lock className="size-3" />
        Members only
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-sage/30 bg-sage/15 px-2.5 py-0.5 text-[11px] font-semibold text-sage">
      Public
    </span>
  );
}
