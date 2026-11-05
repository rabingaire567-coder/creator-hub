import { useState } from "react";
import { Link, useParams } from "react-router";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ImageIcon,
  Loader2,
  Pencil,
  RefreshCw,
  Star,
  Wallet,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
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
  EditorDialog,
  QrButton,
  ReviewDialog,
  type ReviewTarget,
} from "@/admin/AdminEditors";
import { VideoEarningsPanel } from "@/admin/VideoEarningsPanel";
import { StatusPill } from "@/admin/shared";
import { formatDate } from "@/lib/format";
import { formatCount, formatRs } from "@/lib/editor";
import { cn } from "@/lib/utils";

type Detail = NonNullable<
  FunctionReturnType<typeof api.editors.adminEditorDetail>
>;

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="border-border/70 bg-card/60">
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className={cn("mt-1 font-display text-xl font-semibold", tone)}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

/** Admin view of a single editor: performance, earnings, payments, requests. */
export default function AdminEditorDetail() {
  const { id } = useParams<{ id: string }>();
  const detail = useQuery(
    api.editors.adminEditorDetail,
    id ? { editorId: id as Id<"editorProfiles"> } : "skip",
  );
  const sync = useAction(api.youtube.syncYoutubeStats);
  const [editOpen, setEditOpen] = useState(false);
  const [manageVideoId, setManageVideoId] = useState<Id<"posts"> | null>(null);
  const [review, setReview] = useState<{
    target: ReviewTarget;
    action: "paid" | "rejected" | "pending";
  } | null>(null);
  const [syncing, setSyncing] = useState(false);

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

  if (detail === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <Card className="border-border/70 bg-card/60">
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <p className="font-display text-lg font-semibold">Editor not found</p>
          <p className="text-sm text-muted-foreground">
            This editor may have been removed.
          </p>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/admin/editors">Back to editors</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { editor, totals, videos, payments, requests } = detail;
  const editorName = editor.displayName;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 mb-2 rounded-full text-muted-foreground"
          >
            <Link to="/admin/editors">
              <ArrowLeft className="size-4" /> Editors
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            {editor.photo ? (
              <img
                src={editor.photo}
                alt=""
                className="size-12 rounded-xl object-cover"
              />
            ) : (
              <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-ember to-clay font-display text-lg font-bold text-white">
                {editorName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                {editorName}
              </h1>
              <p className="text-sm text-muted-foreground">
                @{editor.username}
                {editor.email ? ` · ${editor.email}` : ""}
              </p>
            </div>
            <span
              className={cn(
                "ml-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                editor.status === "disabled"
                  ? "border-border bg-muted text-muted-foreground"
                  : "border-sage/30 bg-sage/15 text-sage",
              )}
            >
              {editor.status === "disabled" ? "Disabled" : "Active"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            disabled={syncing}
            onClick={() => void runSync()}
          >
            {syncing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Sync YouTube
          </Button>
          <Button className="rounded-full" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" /> Edit profile
          </Button>
        </div>
      </div>

      {editor.bio && (
        <Card className="mb-4 border-border/70 bg-card/60">
          <CardContent className="p-4 text-sm text-muted-foreground">
            {editor.bio}
          </CardContent>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Assigned videos"
          value={String(totals.assignedVideos)}
        />
        <Stat label="YouTube views" value={formatCount(totals.totalViews)} />
        <Stat label="Eligible views" value={formatCount(totals.eligibleViews)} />
        <Stat
          label="Avg. rating"
          value={totals.avgRating ? `${totals.avgRating.toFixed(1)} ★` : "—"}
          tone="text-gold"
        />
        <Stat
          label="Total earned"
          value={formatRs(totals.totalEarned)}
          tone="text-sage"
        />
        <Stat label="Total paid" value={formatRs(totals.totalPaid)} />
        <Stat
          label="Outstanding"
          value={formatRs(totals.outstanding)}
          tone="text-ember"
        />
        <Stat
          label="Pending requests"
          value={String(totals.pendingRequests)}
          tone="text-gold"
        />
      </div>

      <div className="mb-6 rounded-xl border border-border/70 bg-card/40 px-4 py-3 text-xs text-muted-foreground">
        {detail.youtubeConfigured
          ? detail.lastSyncedAt
            ? `YouTube sync enabled · last successful sync ${formatDate(detail.lastSyncedAt)}.`
            : "YouTube sync enabled · waiting for the first sync."
          : "YouTube sync is not configured (missing YOUTUBE_API_KEY). Stored statistics are shown as-is."}
      </div>

      {/* Videos */}
      <Card className="mb-6 border-border/70 bg-card/60">
        <CardHeader>
          <CardTitle className="font-display text-lg">Assigned videos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {videos.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No videos assigned yet. Assign one from Content → edit → Editor
              assignment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead>Video</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Eligible</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Earned</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos.map((video: Detail["videos"][number]) => (
                    <TableRow key={video.post._id} className="border-border/50">
                      <TableCell className="max-w-56">
                        <p className="truncate text-sm font-medium">
                          {video.post.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Assigned {formatDate(video.post.assignedAt) || "—"}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatCount(video.earnings.currentViews)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatCount(video.earnings.eligibleViews)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-sm text-gold">
                          {video.earnings.stars}
                          <Star className="size-3 fill-gold text-gold" />
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-sage">
                        {formatRs(video.earnings.totalEarnings)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatRs(video.earnings.paid)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm font-semibold text-ember">
                        {formatRs(video.earnings.remaining)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() => setManageVideoId(video.post._id)}
                          >
                            <Wallet className="size-3.5" /> Manage
                          </Button>
                          {video.pendingRequest && (
                            <StatusPill status="pending" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Requests */}
        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Payment requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                No payment requests from this editor yet.
              </p>
            ) : (
              requests.map((request: Detail["requests"][number]) => (
                <div
                  key={request._id}
                  className="space-y-2 rounded-xl border border-border/60 bg-background/40 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {request.videoTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRs(request.amount)} ·{" "}
                        {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <StatusPill status={request.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {request.hasQr ? (
                      <QrButton requestId={request._id} />
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <ImageIcon className="size-3.5" /> No QR attached
                      </span>
                    )}
                    <div className="ml-auto flex gap-2">
                      {request.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full text-destructive hover:text-destructive"
                            onClick={() =>
                              setReview({
                                target: {
                                  _id: request._id,
                                  amount: request.amount,
                                  editorName,
                                  videoTitle: request.videoTitle,
                                },
                                action: "rejected",
                              })
                            }
                          >
                            <XCircle className="size-3.5" /> Reject
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-full"
                            onClick={() =>
                              setReview({
                                target: {
                                  _id: request._id,
                                  amount: request.amount,
                                  editorName,
                                  videoTitle: request.videoTitle,
                                },
                                action: "paid",
                              })
                            }
                          >
                            <Wallet className="size-3.5" /> Mark paid
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {request.adminNote && (
                    <p className="text-xs text-muted-foreground">
                      Note: {request.adminNote}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Payment history */}
        <Card className="border-border/70 bg-card/60">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Payment history
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Video</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Reference
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment: Detail["payments"][number]) => (
                    <TableRow key={payment._id} className="border-border/50">
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(payment.paidAt)}
                      </TableCell>
                      <TableCell className="max-w-40 truncate text-sm">
                        {payment.videoTitle}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm font-semibold text-sage">
                        {formatRs(payment.amount)}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                        {payment.reference || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        {editOpen && (
          <EditorDialog
            key={editor._id}
            editor={editor as Doc<"editorProfiles">}
            onOpenChange={setEditOpen}
          />
        )}
      </Dialog>

      {manageVideoId && (
        <VideoEarningsPanel
          postId={manageVideoId}
          open={manageVideoId !== null}
          onOpenChange={(open) => {
            if (!open) setManageVideoId(null);
          }}
        />
      )}

      <Dialog
        open={review !== null}
        onOpenChange={(open) => {
          if (!open) setReview(null);
        }}
      >
        {review && (
          <ReviewDialog
            request={review.target}
            action={review.action}
            onOpenChange={() => setReview(null)}
          />
        )}
      </Dialog>
    </div>
  );
}
