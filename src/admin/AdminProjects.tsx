import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
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
import { PROJECT_CATEGORIES, PROJECT_STATUSES } from "@/lib/constants";
import { truncate } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProjectDoc = Doc<"projects">;

interface ProjectFormValues {
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  technologies: string;
  githubUrl: string;
  liveUrl: string;
  status: string;
  progress: number;
  featured: boolean;
  published: boolean;
}

function fromProject(project: ProjectDoc | null): ProjectFormValues {
  return {
    name: project?.name ?? "",
    description: project?.description ?? "",
    thumbnail: project?.thumbnail ?? "",
    category: project?.category ?? PROJECT_CATEGORIES[0],
    technologies: (project?.technologies ?? []).join(", "),
    githubUrl: project?.githubUrl ?? "",
    liveUrl: project?.liveUrl ?? "",
    status: project?.status ?? PROJECT_STATUSES[0],
    progress: project?.progress ?? 0,
    featured: project?.featured ?? false,
    published: project?.published ?? false,
  };
}

function ProjectEditor({
  project,
  onOpenChange,
}: {
  project: ProjectDoc | null;
  onOpenChange: (open: boolean) => void;
}) {
  const createProject = useMutation(api.projects.createProject);
  const updateProject = useMutation(api.projects.updateProject);
  const [form, setForm] = useState<ProjectFormValues>(() =>
    fromProject(project),
  );
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProjectFormValues>(
    key: K,
    value: ProjectFormValues[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Project name is required.");
      return;
    }
    const technologies = form.technologies
      .split(",")
      .map((tech) => tech.trim())
      .filter(Boolean);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      thumbnail: form.thumbnail.trim() || undefined,
      category: form.category,
      technologies,
      githubUrl: form.githubUrl.trim() || undefined,
      liveUrl: form.liveUrl.trim() || undefined,
      status: form.status,
      progress: form.progress,
      featured: form.featured,
      published: form.published,
    };
    setSaving(true);
    const ok = await runAction(
      () =>
        project
          ? updateProject({ id: project._id, patch: payload })
          : createProject(payload),
      project ? "Project updated." : "Project created.",
      toast,
    );
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle className="font-display">
          {project ? "Edit project" : "New project"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="proj-name">Name</Label>
          <Input
            id="proj-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Storybench"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="proj-desc">Description</Label>
          <Textarea
            id="proj-desc"
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What it is, who it's for, what you learned…"
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
                {PROJECT_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(value) => set("status", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="proj-github">GitHub URL</Label>
            <Input
              id="proj-github"
              value={form.githubUrl}
              onChange={(e) => set("githubUrl", e.target.value)}
              placeholder="https://github.com/…"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="proj-live">Live URL</Label>
            <Input
              id="proj-live"
              value={form.liveUrl}
              onChange={(e) => set("liveUrl", e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="proj-thumb">Thumbnail URL</Label>
            <Input
              id="proj-thumb"
              value={form.thumbnail}
              onChange={(e) => set("thumbnail", e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="proj-tech">Technologies</Label>
            <Input
              id="proj-tech"
              value={form.technologies}
              onChange={(e) => set("technologies", e.target.value)}
              placeholder="React, Convex, Tailwind"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="proj-progress">
            Progress — {form.progress}%
          </Label>
          <input
            id="proj-progress"
            type="range"
            min={0}
            max={100}
            step={5}
            value={form.progress}
            onChange={(e) => set("progress", Number(e.target.value))}
            className="w-full accent-[var(--ember)]"
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
            {saving ? "Saving…" : project ? "Save changes" : "Create project"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

/** Admin screen for portfolio projects at /projects. */
export default function AdminProjects() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectDoc | null>(null);

  const projects = useQuery(api.projects.listProjects, {
    includeDrafts: true,
    filter: search.trim() || undefined,
    page,
  });
  const deleteProject = useMutation(api.projects.deleteProject);
  const setPublished = useMutation(api.projects.setProjectPublished);
  const setFeatured = useMutation(api.projects.setProjectFeatured);

  const items = projects?.items ?? [];
  const total = projects?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (project: ProjectDoc) => {
    setEditing(project);
    setEditorOpen(true);
  };

  const handleDelete = async (project: ProjectDoc) => {
    if (!confirmAction(`Delete “${project.name}”? This cannot be undone.`))
      return;
    await runAction(
      () => deleteProject({ id: project._id }),
      "Project deleted.",
      toast,
    );
  };

  return (
    <div>
      <AdminPageHeader
        title="Projects"
        description="Portfolio work shown on /projects and the homepage."
        actions={
          <Button onClick={openNew} className="rounded-full">
            <Plus className="size-4" />
            New project
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
          placeholder="Search projects…"
          className="max-w-sm"
        />
        <span className="text-sm text-muted-foreground">{total} projects</span>
      </div>

      <Card className="border-border/70 bg-card/60">
        <CardContent className="p-0">
          {projects === undefined ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No projects yet. Add your first one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Category
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Progress
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((project) => (
                  <TableRow key={project._id} className="border-border/50">
                    <TableCell className="max-w-xs">
                      <div className="flex items-center gap-2">
                        {project.featured && (
                          <Star className="size-3.5 shrink-0 fill-gold text-gold" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium">{project.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {truncate(project.description, 70)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {project.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusPill status={project.status ?? "Idea"} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-ember to-gold"
                            style={{
                              width: `${Math.min(100, project.progress ?? 0)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {project.progress ?? 0}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title={project.published ? "Unpublish" : "Publish"}
                          onClick={() =>
                            runAction(
                              () =>
                                setPublished({
                                  id: project._id,
                                  published: !project.published,
                                }),
                              project.published
                                ? "Moved back to drafts."
                                : "Published.",
                              toast,
                            )
                          }
                        >
                          {project.published ? (
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
                                  id: project._id,
                                  featured: !project.featured,
                                }),
                              project.featured
                                ? "Removed from featured."
                                : "Featured.",
                              toast,
                            )
                          }
                        >
                          <Star
                            className={cn(
                              "size-4",
                              project.featured
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
                          onClick={() => openEdit(project)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => handleDelete(project)}
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

      <div className="mt-4 flex items-center justify-end text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <span>
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
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        {editorOpen && (
          <ProjectEditor
            key={editing?._id ?? "new"}
            project={editing}
            onOpenChange={setEditorOpen}
          />
        )}
      </Dialog>

      <p className={cn("mt-6 text-xs text-muted-foreground")}>
        Projects marked “Building” can be pinned as the homepage's current
        project in Homepage settings.
      </p>
    </div>
  );
}
