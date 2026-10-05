import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  Bell,
  Bookmark,
  Lightbulb,
  MessagesSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/site/Reveal";
import { formatDate, timeAgo } from "@/lib/format";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Member landing screen: welcome + quick actions + latest creator updates. */
export default function MemberHome() {
  const profile = useQuery(api.members.getMyProfile);
  const unreadMessages = useQuery(api.members.countUnreadMessages) ?? 0;
  const unreadNotifications =
    useQuery(api.members.countUnreadNotifications) ?? 0;
  const savedCount = (useQuery(api.members.listSavedContent) ?? []).length;
  const updates = (useQuery(api.members.listCreatorUpdates) ?? []).slice(0, 3);

  const firstName =
    profile?.displayName?.split(/\s+/)[0] ?? "there";

  const actions = [
    {
      to: "/member/messages",
      icon: MessagesSquare,
      title: "Community messages",
      body:
        unreadMessages > 0
          ? `${unreadMessages} unread ${unreadMessages === 1 ? "reply" : "replies"} from the creator.`
          : "Chat directly with the creator — replies land here.",
      badge: unreadMessages,
    },
    {
      to: "/member/notifications",
      icon: Bell,
      title: "Notifications",
      body:
        unreadNotifications > 0
          ? `${unreadNotifications} new ${unreadNotifications === 1 ? "notification" : "notifications"}.`
          : "Replies, announcements and important updates.",
      badge: unreadNotifications,
    },
    {
      to: "/member/saved",
      icon: Bookmark,
      title: "Saved content",
      body:
        savedCount > 0
          ? `${savedCount} ${savedCount === 1 ? "item" : "items"} saved for later.`
          : "Bookmark videos, articles and projects to revisit.",
      badge: 0,
    },
    {
      to: "/member/suggest",
      icon: Lightbulb,
      title: "Suggest a topic",
      body: "Tell the creator what to make next — the best ideas get made.",
      badge: 0,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <Reveal>
        <div className="grain relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-ember/15 via-card to-gold/10 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-ember">
            {greeting()}
          </p>
          <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Welcome to the community, {firstName}.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            You're a member now. Message the creator directly, keep your
            favorite content close, suggest what comes next and catch every
            update before it goes public.
          </p>
          {profile?.createdAt ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Member since {formatDate(profile.createdAt)}
            </p>
          ) : null}
        </div>
      </Reveal>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        {actions.map((action, index) => (
          <Reveal key={action.to} delay={index * 0.06}>
            <Link to={action.to} className="block h-full">
              <Card className="h-full border-border/70 bg-card/60 transition-all duration-300 hover:-translate-y-0.5 hover:border-ember/35">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember">
                      <action.icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">
                          {action.title}
                        </p>
                        {action.badge > 0 ? (
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-ember px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {action.badge}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {action.body}
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </Reveal>
        ))}
      </div>

      {/* Recent creator updates */}
      <Reveal delay={0.1}>
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Creator updates
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                News and announcements, shared with members first.
              </p>
            </div>
            <Link
              to="/member/updates"
              className="inline-flex items-center gap-1 text-sm font-semibold text-ember transition-colors hover:text-clay"
            >
              All updates
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {updates.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
              No updates yet — when the creator publishes one, it will show up
              here (and in your notifications).
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {updates.map((update) => (
                <div
                  key={update._id}
                  className="flex gap-4 rounded-2xl border border-border/60 bg-background/40 p-4"
                >
                  <span
                    className={
                      "mt-0.5 inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-[11px] font-semibold capitalize " +
                      (update.kind === "announcement"
                        ? "border-gold/30 bg-gold/15 text-gold"
                        : "border-ember/30 bg-ember/15 text-ember")
                    }
                  >
                    {update.kind === "announcement"
                      ? "Announcement"
                      : "Update"}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {update.title}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(update.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {update.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}
