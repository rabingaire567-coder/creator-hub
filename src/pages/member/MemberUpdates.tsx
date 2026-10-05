import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Megaphone, Newspaper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal } from "@/components/site/Reveal";
import { formatDate, timeAgo } from "@/lib/format";

/** Creator updates & community announcements feed (members only). */
export default function MemberUpdates() {
  const updates = useQuery(api.members.listCreatorUpdates);

  return (
    <Reveal>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Creator updates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Announcements, milestones and important news — shared with the
            community first.
          </p>
        </div>

        {updates === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : updates.length === 0 ? (
          <Card className="border-border/70 bg-card/60">
            <CardContent className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-ember/10">
                <Megaphone className="size-5 text-ember" />
              </span>
              <p className="mt-4 font-display text-lg font-semibold text-foreground">
                No updates yet
              </p>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                When the creator publishes an update or announcement, it lands
                here first — and in your notifications.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {updates.map((update) => (
              <Card
                key={update._id}
                className="border-border/70 bg-card/60 transition-colors hover:border-ember/30"
              >
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize " +
                        (update.kind === "announcement"
                          ? "border-gold/30 bg-gold/15 text-gold"
                          : "border-ember/30 bg-ember/15 text-ember")
                      }
                    >
                      {update.kind === "announcement" ? (
                        <Megaphone className="size-3" />
                      ) : (
                        <Newspaper className="size-3" />
                      )}
                      {update.kind === "announcement"
                        ? "Announcement"
                        : "Update"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(update.createdAt)} · {timeAgo(update.createdAt)}
                    </span>
                  </div>
                  <h2 className="font-display mt-3 text-lg font-semibold text-foreground">
                    {update.title}
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {update.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}
