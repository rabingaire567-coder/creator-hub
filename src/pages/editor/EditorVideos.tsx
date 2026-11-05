import { useState } from "react";
import { useOutletContext } from "react-router";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  PlayCircle,
  RefreshCw,
  Star,
  ThumbsUp,
  Upload,
  Wallet,
} from "lucide-react";
import type { EditorOutletContext } from "./EditorApp";
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
import { Textarea } from "@/components/ui/textarea";
import { Reveal } from "@/components/site/Reveal";
import { compressThumbnail } from "@/lib/pdf";
import { formatDate, timeAgo } from "@/lib/format";
import {
  buildPaymentRequestLink,
  formatCount,
  formatPercent,
  formatRs,
} from "@/lib/editor";
import { cn } from "@/lib/utils";

type EditorVideo = EditorOutletContext["dashboard"]["videos"][number];

const STATUS_TONE: Record<string, string> = {
  unpaid: "border-border bg-muted text-muted-foreground",
  partial: "border-gold/30 bg-gold/15 text-gold",
  paid: "border-sage/30 bg-sage/15 text-sage",
};

const STATUS_LABEL: Record<string, string> = {
  unpaid: "Unpaid",
  partial: "Partially paid",
  paid: "Paid",
};

function RequestPaymentDialog({
  video,
  open,
  onOpenChange,
  settings,
  editorName,
}: {
  video: EditorVideo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: EditorOutletContext["dashboard"]["settings"];
  editorName: string;
}) {
  const createRequest = useMutation(api.editors.createPaymentRequest);
  const [amount, setAmount] = useState(video.remaining.toFixed(2));
  const [note, setNote] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [processingQr, setProcessingQr] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleQrFile = async (file: File | undefined) => {
    if (!file) return;
    setProcessingQr(true);
    try {
      const dataUrl = await compressThumbnail(file);
      setQrCode(dataUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't read that image.",
      );
    } finally {
      setProcessingQr(false);
    }
  };

  const submit = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter the amount you want to request.");
      return;
    }
    if (value > video.remaining + 0.005) {
      toast.error(
        `You can request at most ${formatRs(video.remaining)} on this video.`,
      );
      return;
    }
    if (!qrCode) {
      toast.error("Upload your eSewa QR code before requesting payment.");
      return;
    }
    setSaving(true);
    try {
      await createRequest({
        postId: video._id,
        amount: Number(value.toFixed(2)),
        qrCode,
        note: note.trim() || undefined,
      });
      const { url } = buildPaymentRequestLink(settings.whatsappNumber, {
        editorName,
        videoTitle: video.title,
        youtubeUrl: video.youtubeUrl,
        eligibleViews: video.eligibleViews,
        rating: video.stars,
        totalEarnings: video.totalEarnings,
        paid: video.paid,
        requestedAmount: Number(value.toFixed(2)),
      });
      toast.success("Payment request submitted for review.");
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
        toast.message("WhatsApp opened with your payment details.");
      } else {
        toast.error(
          "WhatsApp isn't configured yet, so no message was opened. Your request is saved for the admin to review.",
        );
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't submit the payment request.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Request payment</DialogTitle>
          <DialogDescription>
            Payments are handled manually by the owner outside Creator Hub.
            Upload your eSewa QR code and send the WhatsApp message so they can
            pay you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-background/40 p-3 text-sm">
            <p className="font-medium">{video.title}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between gap-2">
                <dt>Eligible views</dt>
                <dd className="font-medium text-foreground">
                  {formatCount(video.eligibleViews)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Rating</dt>
                <dd className="font-medium text-gold">{video.stars} ★</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Total earnings</dt>
                <dd className="font-medium text-foreground">
                  {formatRs(video.totalEarnings)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Already paid</dt>
                <dd className="font-medium text-foreground">
                  {formatRs(video.paid)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="request-amount">Amount to request (Rs.)</Label>
            <Input
              id="request-amount"
              type="number"
              min={0.01}
              max={video.remaining}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Maximum {formatRs(video.remaining)} — your unpaid balance on this
              video. Minimum payout is {formatRs(settings.minPayout)}.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="request-qr">eSewa QR code</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-sm font-medium transition-colors hover:border-ember/40">
                {processingQr ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {qrCode ? "Replace QR image" : "Upload QR image"}
                <input
                  id="request-qr"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    void handleQrFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
              {qrCode ? (
                <img
                  src={qrCode}
                  alt="eSewa QR preview"
                  className="size-20 rounded-lg border border-border/70 bg-white object-contain p-1"
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  PNG, JPG or WebP — used only for this payout.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="request-note">Note for the owner (optional)</Label>
            <Textarea
              id="request-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Please pay this to my eSewa account."
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="rounded-full"
            disabled={saving || processingQr}
            onClick={() => void submit()}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wallet className="size-4" />
            )}
            Request & open WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VideoCard({
  video,
  minPayout,
  onRequest,
}: {
  video: EditorVideo;
  minPayout: number;
  onRequest: (video: EditorVideo) => void;
}) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card/60">
      <div className="relative aspect-video w-full bg-muted">
        {video.youtubeId ? (
          <img
            src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
            alt={video.title}
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <PlayCircle className="size-10" />
          </div>
        )}
        <span
          className={cn(
            "absolute right-2 top-2 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
            STATUS_TONE[video.paymentStatus] ??
              "border-border bg-muted text-muted-foreground",
          )}
        >
          {STATUS_LABEL[video.paymentStatus] ?? video.paymentStatus}
        </span>
      </div>

      <CardContent className="space-y-4 p-4">
        <div>
          <h3 className="line-clamp-2 font-display text-base font-semibold">
            {video.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>Assigned {formatDate(video.assignedAt) || "—"}</span>
            {video.youtubeUrl && (
              <a
                href={video.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-ember hover:underline"
              >
                Watch on YouTube <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg border border-border/60 bg-background/40 p-2">
            <p className="text-[11px] text-muted-foreground">YouTube views</p>
            <p className="font-medium">{formatCount(video.currentViews)}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 p-2">
            <p className="text-[11px] text-muted-foreground">Likes</p>
            <p className="flex items-center gap-1 font-medium">
              <ThumbsUp className="size-3.5 text-dusk" />
              {formatCount(video.likes)}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 p-2">
            <p className="text-[11px] text-muted-foreground">Eligible views</p>
            <p className="font-medium">{formatCount(video.eligibleViews)}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 p-2">
            <p className="text-[11px] text-muted-foreground">
              Creator Hub rating
            </p>
            <p className="flex items-center gap-1 font-medium text-gold">
              {video.stars}
              <Star className="size-3.5 fill-gold text-gold" />
              <span className="text-[11px] font-normal text-muted-foreground">
                {formatPercent(video.percent)}
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-1.5 rounded-xl border border-border/60 bg-background/40 p-3 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">
              Base ({formatCount(video.eligibleViews)} views ÷ 1,000 ×{" "}
              {formatRs(video.ratePerThousand)})
            </span>
            <span className="font-medium">{formatRs(video.baseEarnings)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">
              Rating bonus ({video.multiplier}×)
            </span>
            <span className="font-medium text-sage">
              {video.bonusEarnings >= 0 ? "+" : ""}
              {formatRs(video.bonusEarnings)}
            </span>
          </div>
          <div className="flex justify-between gap-2 border-t border-border/60 pt-1.5">
            <span className="font-medium">Total earnings</span>
            <span className="font-semibold">{formatRs(video.totalEarnings)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Paid</span>
            <span className="font-medium">{formatRs(video.paid)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Remaining payable</span>
            <span className="font-semibold text-ember">
              {formatRs(video.remaining)}
            </span>
          </div>
        </div>

        {video.pendingRequestId ? (
          <Button disabled variant="outline" className="w-full rounded-full">
            <Clock className="size-4" /> Payout request pending
          </Button>
        ) : video.eligibleViews <= 0 ? (
          <p className="rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-center text-xs text-muted-foreground">
            Earnings start once new views arrive after assignment.
          </p>
        ) : video.remaining + 0.005 < minPayout ? (
          <p className="rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-center text-xs text-muted-foreground">
            Request a payout once at least {formatRs(minPayout)} is outstanding.
          </p>
        ) : (
          <Button
            className="w-full rounded-full bg-ember text-white hover:brightness-110"
            onClick={() => onRequest(video)}
          >
            <Wallet className="size-4" /> Request payment
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** All videos assigned to the editor, with live earnings and payout requests. */
export default function EditorVideos() {
  const { dashboard } = useOutletContext<EditorOutletContext>();
  const [requestVideo, setRequestVideo] = useState<EditorVideo | null>(null);
  const { videos, settings, youtubeConfigured, lastSyncedAt, editor } =
    dashboard;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            My Videos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Views, eligible views and earnings for every video assigned to you.
          </p>
        </div>
        <div className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          {youtubeConfigured && lastSyncedAt ? (
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className="size-3" />
              Last synced {timeAgo(lastSyncedAt)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-gold">
              <AlertTriangle className="size-3" />
              YouTube sync not configured
            </span>
          )}
        </div>
      </div>

      {!settings.whatsappNumber && (
        <p className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
          WhatsApp isn&apos;t configured yet. You can still submit a payment
          request — the owner sees it in their payout queue — but no WhatsApp
          message will open until they add their number in the editor settings.
        </p>
      )}

      {!youtubeConfigured && (
        <Card className="border-gold/30 bg-gold/5">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-gold" />
            <p className="text-muted-foreground">
              Live YouTube statistics need a{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                YOUTUBE_API_KEY
              </code>{" "}
              environment variable with the YouTube Data API v3 enabled. Until
              the owner configures it, the statistics stored for each video are
              shown without changes — no numbers are invented.
            </p>
          </CardContent>
        </Card>
      )}

      {videos.length === 0 ? (
        <Card className="border-dashed border-border/70 bg-card/40">
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-ember/15 text-ember">
              <PlayCircle className="size-6" />
            </span>
            <p className="font-display text-lg font-semibold">
              No videos assigned yet
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              When the owner assigns a video to you, it appears here
              automatically with its earnings breakdown.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {videos.map((video) => (
            <Reveal key={video._id}>
              <VideoCard
                video={video}
                minPayout={settings.minPayout}
                onRequest={setRequestVideo}
              />
            </Reveal>
          ))}
        </div>
      )}

      <Card className="border-border/70 bg-card/40">
        <CardContent className="space-y-2 p-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">How earnings work</p>
          <p>
            Base earnings = eligible views ÷ 1,000 × {formatRs(settings.ratePerThousand)}{" "}
            per 1,000 views. Eligible views are current views minus the snapshot
            taken when you were assigned, so earlier views never count. Partial
            1,000-view increments are paid proportionally.
          </p>
          <p>
            Total earnings = base × rating multiplier. The{" "}
            <span className="font-medium text-foreground">
              Creator Hub calculated rating
            </span>{" "}
            uses the like-to-view ratio ({settings.thresholds.join("% / ")}%
            bands → {settings.multipliers.join("× / ")}×). It is not an official
            YouTube rating.
          </p>
        </CardContent>
      </Card>

      {requestVideo && (
        <RequestPaymentDialog
          key={requestVideo._id}
          video={requestVideo}
          open={requestVideo !== null}
          onOpenChange={(open) => {
            if (!open) setRequestVideo(null);
          }}
          settings={settings}
          editorName={editor.displayName}
        />
      )}
    </div>
  );
}
