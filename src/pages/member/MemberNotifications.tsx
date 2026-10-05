import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Bell, Megaphone, MessageSquare, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal } from "@/components/site/Reveal";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_ICON = {
  message: MessageSquare,
  announcement: Megaphone,
  update: Newspaper,
} as const;

/** Member notifications: replies, announcements and creator updates. */
export default function MemberNotifications() {
  const notifications = useQuery(api.members.listMyNotifications);
  const markAllRead = useMutation(api.members.markNotificationsRead);
  const markOneRead = useMutation(api.members.markNotificationRead);

  const unread =
    notifications?.filter((n) => n.read !== true).length ?? 0;

  return (
    <Reveal>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Notifications
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Creator replies, community announcements and important updates.
            </p>
          </div>
          {unread > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => markAllRead().catch(() => undefined)}
            >
              Mark all as read
            </Button>
          ) : null}
        </div>

        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-0">
            {notifications === undefined ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-ember/10">
                  <Bell className="size-5 text-ember" />
                </span>
                <p className="mt-4 font-display text-lg font-semibold text-foreground">
                  You're all caught up
                </p>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  New replies, announcements and creator updates will appear
                  here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {notifications.map((notification) => {
                  const Icon =
                    TYPE_ICON[
                      notification.type as keyof typeof TYPE_ICON
                    ] ?? Bell;
                  const isUnread = notification.read !== true;
                  return (
                    <li key={notification._id}>
                      <Link
                        to={notification.link ?? "/member"}
                        onClick={() => {
                          if (isUnread)
                            markOneRead({ id: notification._id }).catch(
                              () => undefined,
                            );
                        }}
                        className={cn(
                          "flex gap-4 px-5 py-4 transition-colors hover:bg-accent/50",
                          isUnread && "bg-ember/5",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-full",
                            isUnread
                              ? "bg-ember/15 text-ember"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                "truncate text-sm text-foreground",
                                isUnread && "font-semibold",
                              )}
                            >
                              {notification.title}
                            </p>
                            {isUnread && (
                              <span className="size-2 shrink-0 rounded-full bg-ember" />
                            )}
                          </div>
                          {notification.body && (
                            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                              {notification.body}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {timeAgo(notification.createdAt)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </Reveal>
  );
}
