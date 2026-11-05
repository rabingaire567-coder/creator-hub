import { Link, useOutletContext } from "react-router";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Clock,
  PlayCircle,
  RefreshCw,
  Star,
  Wallet,
} from "lucide-react";
import type { EditorOutletContext } from "./EditorApp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/site/Reveal";
import { formatDate, timeAgo } from "@/lib/format";
import { formatCount, formatRs } from "@/lib/editor";
import { cn } from "@/lib/utils";

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ember" | "sage" | "gold" | "dusk";
}) {
  return (
    <Card className="border-border/70 bg-card/60">
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 font-display text-2xl font-semibold tracking-tight",
            tone === "ember" && "text-ember",
            tone === "sage" && "text-sage",
            tone === "gold" && "text-gold",
            tone === "dusk" && "text-dusk",
          )}
        >
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function initials(name?: string | null) {
  return (
    (name ?? "E")
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "E"
  );
}

/** Editor landing screen: profile, earnings totals and recent activity. */
export default function EditorHome() {
  const { dashboard } = useOutletContext<EditorOutletContext>();
  const {
    editor,
    totals,
    videos,
    requests,
    payments,
    settings,
    youtubeConfigured,
    lastSyncedAt,
  } = dashboard;

  const pending = requests.filter((request) => request.status === "pending");
  const recentVideos = videos.slice(0, 3);
  const recentPayments = payments.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Profile + headline */}
      <Reveal>
        <div className="grain relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-ember/15 via-card to-gold/10 p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {editor.photo ? (
              <img
                src={editor.photo}
                alt={editor.displayName}
                className="size-20 shrink-0 rounded-2xl border border-border/70 object-cover shadow-lg"
              />
            ) : (
              <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-ember via-gold to-clay font-display text-2xl font-bold text-white shadow-lg">
                {initials(editor.displayName)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  {editor.displayName}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-sage/30 bg-sage/15 px-2.5 py-0.5 text-[11px] font-semibold text-sage">
                  <BadgeCheck className="size-3" /> Active editor
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                @{editor.username}
                {editor.email ? ` · ${editor.email}` : ""}
              </p>
              {editor.bio ? (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {editor.bio}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 rounded-2xl border border-border/70 bg-background/50 px-4 py-3 text-left sm:text-right">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Outstanding
              </p>
              <p className="font-display text-2xl font-semibold text-ember">
                {formatRs(totals.outstanding)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatRs(totals.totalPaid)} paid to date
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat
          label="Assigned videos"
          value={formatCount(totals.assignedVideos)}
          hint="Videos credited to you"
        />
        <Stat
          label="Total views"
          value={formatCount(totals.totalViews)}
          hint="Current YouTube views"
        />
        <Stat
          label="Eligible views"
          value={formatCount(totals.eligibleViews)}
          hint="Views since assignment"
        />
        <Stat
          label="Avg. rating"
          value={totals.avgRating ? `${totals.avgRating.toFixed(1)} ★` : "—"}
          hint="Creator Hub calculated"
          tone="gold"
        />
        <Stat
          label="Total earned"
          value={formatRs(totals.totalEarned)}
          hint="Base + rating bonus"
          tone="sage"
        />
        <Stat
          label="Total paid"
          value={formatRs(totals.totalPaid)}
          hint="Recorded by the admin"
        />
        <Stat
          label="Outstanding"
          value={formatRs(totals.outstanding)}
          hint="Still to be paid"
          tone="ember"
        />
        <Stat
          label="Pending requests"
          value={formatCount(totals.pendingRequests)}
          hint={
            settings.minPayout
              ? `Minimum payout ${formatRs(settings.minPayout)}`
              : "Payout requests awaiting review"
          }
          tone="dusk"
        />
      </div>

      {/* Sync status */}
      <Card className="border-border/70 bg-card/60">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                youtubeConfigured
                  ? "bg-sage/15 text-sage"
                  : "bg-gold/15 text-gold",
              )}
            >
              {youtubeConfigured ? (
                <RefreshCw className="size-4" />
              ) : (
                <AlertTriangle className="size-4" />
              )}
            </span>
            <div>
              <p className="text-sm font-medium">
                {youtubeConfigured
                  ? "YouTube statistics sync is enabled"
                  : "YouTube statistics sync is not configured"}
              </p>
              <p className="text-xs text-muted-foreground">
                {youtubeConfigured
                  ? lastSyncedAt
                    ? `Last successful sync ${timeAgo(lastSyncedAt)} — ${formatDate(lastSyncedAt)}. Views and likes refresh hourly.`
                    : "Waiting for the first sync. Views and likes update automatically every hour."
                  : "The owner needs to add a YOUTUBE_API_KEY environment variable (YouTube Data API v3) in Convex. Until then, stored statistics are shown as-is — nothing is fabricated."}
              </p>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="shrink-0 rounded-full"
          >
            <Link to="/editor/videos">
              View videos <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Pending requests callout */}
      {pending.length > 0 && (
        <Card className="border-ember/30 bg-ember/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ember/15 text-ember">
                <Clock className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">
                  {pending.length} payment{" "}
                  {pending.length === 1 ? "request" : "requests"} awaiting review
                </p>
                <p className="text-xs text-muted-foreground">
                  Total requested:{" "}
                  {formatRs(
                    pending.reduce((sum, request) => sum + request.amount, 0),
                  )}
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="shrink-0 rounded-full">
              <Link to="/editor/payments">
                <Wallet className="size-4" /> View payments
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent videos */}
        <Card className="border-border/70 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-lg">Recent videos</CardTitle>
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link to="/editor/videos">All videos</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentVideos.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                No videos assigned yet. Once the owner assigns one, it appears
                here automatically.
              </p>
            ) : (
              recentVideos.map((video) => (
                <Link
                  key={video._id}
                  to="/editor/videos"
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-2.5 transition-colors hover:border-ember/40"
                >
                  {video.youtubeId ? (
                    <img
                      src={`https://i.ytimg.com/vi/${video.youtubeId}/default.jpg`}
                      alt=""
                      className="h-12 w-20 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <PlayCircle className="size-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{video.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCount(video.eligibleViews)} eligible views ·{" "}
                      {formatRs(video.totalEarnings)}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-gold">
                    {video.stars}
                    <Star className="size-3 fill-gold text-gold" />
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent payments */}
        <Card className="border-border/70 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-lg">Recent payouts</CardTitle>
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link to="/editor/payments">History</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPayments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                No payments recorded yet. Request a payout once a video earns at
                least {formatRs(settings.minPayout)}.
              </p>
            ) : (
              recentPayments.map((payment) => (
                <div
                  key={payment._id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {payment.videoTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(payment.paidAt)}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-sage">
                    {formatRs(payment.amount)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
