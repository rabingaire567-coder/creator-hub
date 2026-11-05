import { useState } from "react";
import { Link } from "react-router";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  BadgeCheck,
  ImageIcon,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Settings2,
  Star,
  Upload,
  UserRoundX,
  Wallet,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AdminPageHeader, StatusPill, runAction } from "@/admin/shared";
import { compressThumbnail } from "@/lib/pdf";
import { formatDate } from "@/lib/format";
import { formatCount, formatRs } from "@/lib/editor";
import { cn } from "@/lib/utils";

type EditorRow = NonNullable<
  FunctionReturnType<typeof api.editors.adminListEditors>
>["items"][number];
type EditorSettingsView = NonNullable<
  FunctionReturnType<typeof api.editors.adminListEditors>
>["settings"];
type RequestRow = NonNullable<
  FunctionReturnType<typeof api.editors.adminListPaymentRequests>
>[number];

function initials(name?: string) {
  return (
    (name ?? "E")
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "E"
  );
}

// ---------------------------------------------------------------------------
// Editor create / edit
// ---------------------------------------------------------------------------

export function EditorDialog({
  editor,
  onOpenChange,
}: {
  editor: Doc<"editorProfiles">;
  onOpenChange: (open: boolean) => void;
}) {
  const updateEditor = useMutation(api.editors.adminUpdateEditor);
  const [displayName, setDisplayName] = useState(editor?.displayName ?? "");
  const [username, setUsername] = useState(editor?.username ?? "");
  const [email, setEmail] = useState(editor?.email ?? "");
  const [bio, setBio] = useState(editor?.bio ?? "");
  const [photo, setPhoto] = useState(editor?.photo ?? "");
  const [status, setStatus] = useState(editor?.status ?? "active");
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    setProcessingPhoto(true);
    try {
      setPhoto(await compressThumbnail(file));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't read that image.",
      );
    } finally {
      setProcessingPhoto(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      displayName: displayName.trim(),
      username: username.trim(),
      email: email.trim() || undefined,
      bio: bio.trim() || undefined,
      // An empty string clears the stored photo.
      photo: photo || "",
    };
    const ok = await runAction(
      () =>
        updateEditor({
          editorId: editor._id,
          patch: { ...payload, status },
        }),
      "Editor updated.",
      toast,
    );
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display">Edit editor</DialogTitle>
        <DialogDescription>
          Editors only see their own assigned videos, earnings and payments.
          Profiles come from community members, so create nothing by hand.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-4">
          {photo ? (
            <img
              src={photo}
              alt=""
              className="size-16 rounded-xl border border-border/70 object-cover"
            />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-xl bg-gradient-to-br from-ember to-clay font-display text-lg font-bold text-white">
              {initials(displayName)}
            </span>
          )}
          <div className="flex flex-col gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/70 px-3 py-1.5 text-xs font-medium transition-colors hover:border-ember/40">
              {processingPhoto ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              {photo ? "Replace photo" : "Upload photo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => {
                  void handlePhoto(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            {photo && (
              <button
                type="button"
                className="text-left text-[11px] text-muted-foreground hover:text-destructive"
                onClick={() => setPhoto("")}
              >
                Remove photo
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="editor-name">Display name</Label>
            <Input
              id="editor-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Sita Sharma"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="editor-username">Username</Label>
            <Input
              id="editor-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="sita.edits"
              required
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="editor-email">Account email</Label>
          <Input
            id="editor-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="editor@example.com"
          />
          <p className="text-xs text-muted-foreground">
            When this email signs in, the account is linked to this profile
            automatically.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="editor-bio">Bio</Label>
          <Textarea
            id="editor-bio"
            rows={3}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Short editing background and specialties."
          />
        </div>

        <div className="grid gap-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Disabled editors keep their history but cannot access the editor
            area or request payouts.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="rounded-full"
            disabled={saving || processingPhoto}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ---------------------------------------------------------------------------
// Programme settings
// ---------------------------------------------------------------------------

function SettingsDialog({
  onOpenChange,
  settings,
  youtubeConfigured,
}: {
  onOpenChange: (open: boolean) => void;
  settings: EditorSettingsView;
  youtubeConfigured: boolean;
}) {
  const save = useMutation(api.editors.adminUpdateEditorSettings);
  const sync = useAction(api.youtube.syncYoutubeStats);
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);
  const [rate, setRate] = useState(String(settings.ratePerThousand));
  const [minPayout, setMinPayout] = useState(String(settings.minPayout));
  const [thresholds, setThresholds] = useState(
    settings.thresholds.map((value) => String(value)),
  );
  const [multipliers, setMultipliers] = useState(
    settings.multipliers.map((value) => String(value)),
  );
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const setThreshold = (index: number, value: string) =>
    setThresholds((prev) => prev.map((entry, i) => (i === index ? value : entry)));
  const setMultiplier = (index: number, value: string) =>
    setMultipliers((prev) =>
      prev.map((entry, i) => (i === index ? value : entry)),
    );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const ok = await runAction(
      () =>
        save({
          whatsappNumber: whatsappNumber.trim(),
          ratePerThousand: Number(rate),
          minPayout: Number(minPayout),
          thresholds: thresholds.map(Number),
          multipliers: multipliers.map(Number),
        }),
      "Editor settings saved.",
      toast,
    );
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  const runSync = async () => {
    setSyncing(true);
    try {
      const result = await sync();
      toast.success(
        `Synced ${result.updated} of ${result.videos} assigned videos from YouTube.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "YouTube sync failed.",
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle className="font-display">Editor settings</DialogTitle>
        <DialogDescription>
          Payout rules apply without changing any code. Rates are captured per
          video when it is assigned.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-2">
          <Label htmlFor="settings-whatsapp">WhatsApp number</Label>
          <Input
            id="settings-whatsapp"
            value={whatsappNumber}
            onChange={(event) => setWhatsappNumber(event.target.value)}
            placeholder="+9779800000000"
          />
          <p className="text-xs text-muted-foreground">
            Include the country code. Payment requests open a click-to-chat
            message with this number.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="settings-rate">Rate per 1,000 views (Rs.)</Label>
            <Input
              id="settings-rate"
              type="number"
              min={0}
              step="0.01"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="settings-min">Minimum payout (Rs.)</Label>
            <Input
              id="settings-min"
              type="number"
              min={0}
              step="0.01"
              value={minPayout}
              onChange={(event) => setMinPayout(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>Like/view rating thresholds (%)</Label>
          <div className="grid grid-cols-4 gap-2">
            {thresholds.map((value, index) => (
              <Input
                key={index}
                type="number"
                min={0}
                step="0.1"
                value={value}
                onChange={(event) => setThreshold(index, event.target.value)}
                aria-label={`Threshold ${index + 1}`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Band {">"} 1★ below {thresholds[0]}% · 2★ from {thresholds[0]}% · 3★
            from {thresholds[1]}% · 4★ from {thresholds[2]}% · 5★ from{" "}
            {thresholds[3]}%.
          </p>
        </div>

        <div className="grid gap-2">
          <Label>Earning multipliers (1★ → 5★)</Label>
          <div className="grid grid-cols-5 gap-2">
            {multipliers.map((value, index) => (
              <Input
                key={index}
                type="number"
                min={0}
                step="0.05"
                value={value}
                onChange={(event) => setMultiplier(index, event.target.value)}
                aria-label={`Multiplier ${index + 1} star`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-background/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">YouTube statistics</p>
              <p className="text-xs text-muted-foreground">
                {youtubeConfigured
                  ? "YOUTUBE_API_KEY is configured. Views and likes refresh hourly."
                  : "Add a YOUTUBE_API_KEY environment variable in Convex to enable live statistics."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={syncing}
              onClick={() => void runSync()}
            >
              {syncing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Sync now
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" className="rounded-full" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ---------------------------------------------------------------------------
// Payment request review
// ---------------------------------------------------------------------------

export function QrButton({ requestId }: { requestId: Id<"paymentRequests"> }) {
  const [open, setOpen] = useState(false);
  const qr = useQuery(
    api.editors.adminGetPaymentRequestQr,
    open ? { requestId } : "skip",
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full"
        onClick={() => setOpen(true)}
      >
        <ImageIcon className="size-3.5" /> eSewa QR
      </Button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">eSewa QR code</DialogTitle>
        </DialogHeader>
        {qr === undefined ? (
          <Skeleton className="mx-auto aspect-square w-full max-w-64" />
        ) : qr === null ? (
          <p className="text-sm text-muted-foreground">
            No QR code was attached to this request.
          </p>
        ) : (
          <img
            src={qr}
            alt="eSewa QR code"
            className="mx-auto max-h-80 rounded-xl border border-border/70 bg-white object-contain p-2"
          />
        )}
        <p className="text-xs text-muted-foreground">
          Scan with the eSewa app to pay the editor manually. Creator Hub never
          moves money automatically.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export interface ReviewTarget {
  _id: Id<"paymentRequests">;
  amount: number;
  editorName: string;
  videoTitle: string;
}

export function ReviewDialog({
  request,
  action,
  onOpenChange,
}: {
  request: ReviewTarget;
  action: "paid" | "rejected" | "pending";
  onOpenChange: () => void;
}) {
  const review = useMutation(api.editors.adminReviewPaymentRequest);
  const [amount, setAmount] = useState(String(request.amount));
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const ok = await runAction(
      () =>
        review({
          requestId: request._id,
          status: action,
          amountPaid: action === "paid" ? Number(amount) : undefined,
          adminNote: adminNote.trim() || undefined,
        }),
      action === "paid"
        ? "Payment recorded and request marked paid."
        : action === "rejected"
          ? "Request rejected."
          : "Request reopened.",
      toast,
    );
    setSaving(false);
    if (ok) onOpenChange();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display">
          {action === "paid"
            ? "Record payment"
            : action === "rejected"
              ? "Reject request"
              : "Reopen request"}
        </DialogTitle>
        <DialogDescription>
          {request.editorName} · {request.videoTitle} ·{" "}
          {formatRs(request.amount)} requested
        </DialogDescription>
      </DialogHeader>

      {action === "paid" && (
        <div className="grid gap-2">
          <Label htmlFor="review-amount">Amount paid (Rs.)</Label>
          <Input
            id="review-amount"
            type="number"
            min={0.01}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            This creates an auditable payment record. It cannot exceed the
            editor&apos;s remaining balance.
          </p>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="review-note">Note (optional)</Label>
        <Textarea
          id="review-note"
          rows={3}
          value={adminNote}
          onChange={(event) => setAdminNote(event.target.value)}
          placeholder={
            action === "paid"
              ? "eSewa transaction ID or memo"
              : "Reason shared with the editor"
          }
        />
      </div>

      <DialogFooter className="gap-2">
        <Button
          variant="ghost"
          className="rounded-full"
          onClick={onOpenChange}
        >
          Cancel
        </Button>
        <Button
          className={cn(
            "rounded-full",
            action === "rejected" && "bg-destructive hover:bg-destructive/90",
          )}
          disabled={saving}
          onClick={() => void submit()}
        >
          {saving ? "Saving…" : action === "paid" ? "Mark paid" : action === "rejected" ? "Reject" : "Reopen"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

/** Admin-only editor management: profiles, totals, payouts and settings. */
export default function AdminEditors() {
  const list = useQuery(api.editors.adminListEditors);
  const [tab, setTab] = useState("editors");
  const [search, setSearch] = useState("");
  const [requestFilter, setRequestFilter] = useState("pending");
  const requests = useQuery(api.editors.adminListPaymentRequests, {
    status: requestFilter === "all" ? undefined : requestFilter,
  });
  const [editorDialog, setEditorDialog] = useState<{
    open: boolean;
    editor: Doc<"editorProfiles"> | null;
  }>({ open: false, editor: null });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [review, setReview] = useState<{
    request: RequestRow;
    action: "paid" | "rejected" | "pending";
  } | null>(null);

  const items = list?.items ?? [];
  const term = search.trim().toLowerCase();
  const filtered = term
    ? items.filter(
        (item) =>
          item.editor.displayName.toLowerCase().includes(term) ||
          item.editor.username.toLowerCase().includes(term) ||
          (item.editor.email ?? "").toLowerCase().includes(term),
      )
    : items;
  const pendingCount = items.reduce(
    (sum, item) => sum + item.totals.pendingRequests,
    0,
  );

  return (
    <div>
      <AdminPageHeader
        title="Editors"
        description="Community members who activated editor access, with their videos, earnings and manual payouts."
        actions={
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 className="size-4" /> Settings
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="editors">
            Editors
            <span className="ml-1.5 rounded-full bg-ember/15 px-1.5 text-[10px] font-bold text-ember">
              {items.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="requests">
            Payout requests
            {pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-ember px-1.5 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editors" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search editors by name, username or email…"
                className="pl-9"
              />
            </div>
            {list && (
              <span className="text-sm text-muted-foreground">
                {formatCount(filtered.length)} editors
              </span>
            )}
          </div>

          <Card className="border-border/70 bg-card/60">
            <CardContent className="p-0">
              {list === undefined ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 p-10 text-center">
                  <UserRoundX className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {items.length === 0
                      ? "No editors yet. Community members appear here after they activate editor access on the community page."
                      : "No editors match that search."}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead>Editor</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Videos
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        Eligible views
                      </TableHead>
                      <TableHead>Earned</TableHead>
                      <TableHead className="hidden lg:table-cell">Paid</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead className="hidden xl:table-cell">
                        Avg. rating
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item: EditorRow) => (
                      <TableRow key={item.editor._id} className="border-border/50">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            {item.editor.photo ? (
                              <img
                                src={item.editor.photo}
                                alt=""
                                className="size-8 rounded-full object-cover"
                              />
                            ) : (
                              <span className="flex size-8 items-center justify-center rounded-full bg-ember/15 text-[11px] font-semibold text-ember">
                                {initials(item.editor.displayName)}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {item.editor.displayName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                @{item.editor.username}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-sm sm:table-cell">
                          {item.totals.assignedVideos}
                        </TableCell>
                        <TableCell className="hidden text-sm md:table-cell">
                          {formatCount(item.totals.eligibleViews)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm font-medium text-sage">
                          {formatRs(item.totals.totalEarned)}
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-sm lg:table-cell">
                          {formatRs(item.totals.totalPaid)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm font-semibold text-ember">
                          {formatRs(item.totals.outstanding)}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <span className="inline-flex items-center gap-1 text-sm">
                            {item.totals.avgRating
                              ? item.totals.avgRating.toFixed(1)
                              : "—"}
                            <Star className="size-3 fill-gold text-gold" />
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                              item.editor.status === "disabled"
                                ? "border-border bg-muted text-muted-foreground"
                                : "border-sage/30 bg-sage/15 text-sage",
                            )}
                          >
                            {item.editor.status === "disabled"
                              ? "Disabled"
                              : "Active"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title="View editor"
                              asChild
                            >
                              <Link to={`/admin/editors/${item.editor._id}`}>
                                <BadgeCheck className="size-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title="Edit profile"
                              onClick={() =>
                                setEditorDialog({
                                  open: true,
                                  editor: item.editor,
                                })
                              }
                            >
                              <Pencil className="size-4" />
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
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={requestFilter} onValueChange={setRequestFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="all">All requests</SelectItem>
              </SelectContent>
            </Select>
            {requests && (
              <span className="text-sm text-muted-foreground">
                {requests.length} {requests.length === 1 ? "request" : "requests"}
              </span>
            )}
          </div>

          {requests === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <Card className="border-dashed border-border/70 bg-card/40">
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                No {requestFilter === "all" ? "" : requestFilter} payout
                requests. Editors can request a payout once a video has enough
                unpaid earnings.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <Card
                  key={request._id}
                  className="border-border/70 bg-card/60"
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {request.editorName}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            @{request.editorUsername}
                          </span>
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {request.videoTitle}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Requested {formatDate(request.createdAt)}
                        </p>
                      </div>
                      <StatusPill status={request.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          Requested
                        </p>
                        <p className="font-semibold text-ember">
                          {formatRs(request.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          Eligible views
                        </p>
                        <p>{formatCount(request.eligibleViews)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          Rating
                        </p>
                        <p className="flex items-center gap-1 text-gold">
                          {request.rating}
                          <Star className="size-3 fill-gold text-gold" />
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          Earnings / paid
                        </p>
                        <p>
                          {formatRs(request.totalEarnings)} /{" "}
                          {formatRs(request.paidSoFar)}
                        </p>
                      </div>
                    </div>

                    {request.note && (
                      <p className="rounded-lg border border-border/60 bg-background/40 p-2 text-xs">
                        <span className="text-muted-foreground">Editor: </span>
                        {request.note}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {request.hasQr ? (
                        <QrButton requestId={request._id} />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No QR attached
                        </span>
                      )}
                      <div className="ml-auto flex flex-wrap gap-2">
                        {request.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full text-destructive hover:text-destructive"
                              onClick={() =>
                                setReview({ request, action: "rejected" })
                              }
                            >
                              <XCircle className="size-3.5" /> Reject
                            </Button>
                            <Button
                              size="sm"
                              className="rounded-full"
                              onClick={() =>
                                setReview({ request, action: "paid" })
                              }
                            >
                              <Wallet className="size-3.5" /> Mark paid
                            </Button>
                          </>
                        )}
                        {request.status === "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() =>
                              setReview({ request, action: "pending" })
                            }
                          >
                            Reopen
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={editorDialog.open}
        onOpenChange={(open) =>
          setEditorDialog((prev) => ({ ...prev, open }))
        }
      >
        {editorDialog.open && editorDialog.editor && (
          <EditorDialog
            key={editorDialog.editor._id}
            editor={editorDialog.editor}
            onOpenChange={(open) =>
              setEditorDialog((prev) => ({ ...prev, open }))
            }
          />
        )}
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        {settingsOpen && list && (
          <SettingsDialog
            onOpenChange={setSettingsOpen}
            settings={list.settings}
            youtubeConfigured={list.youtubeConfigured}
          />
        )}
      </Dialog>

      <Dialog
        open={review !== null}
        onOpenChange={(open) => {
          if (!open) setReview(null);
        }}
      >
        {review && (
          <ReviewDialog
            request={review.request}
            action={review.action}
            onOpenChange={() => setReview(null)}
          />
        )}
      </Dialog>
    </div>
  );
}
