import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  Megaphone,
  Newspaper,
  Search,
  Send,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { AdminPageHeader, confirmAction, runAction } from "@/admin/shared";
import { formatDate, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type MemberMessageDoc = Doc<"memberMessages">;
type CreatorUpdateDoc = Doc<"creatorUpdates">;

function initials(name?: string) {
  return (
    (name ?? "M")
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "M"
  );
}

function StatusBadge({ status }: { status?: string }) {
  const disabled = status === "disabled";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
        disabled
          ? "border-border bg-muted text-muted-foreground"
          : "border-sage/30 bg-sage/15 text-sage",
      )}
    >
      {disabled ? "Disabled" : "Active"}
    </span>
  );
}

function bubbleTime(ts?: number) {
  if (!ts) return "";
  const date = new Date(ts);
  return `${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} · ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function MemberDetailDialog({
  userId,
  onClose,
}: {
  userId: Id<"users"> | null;
  onClose: () => void;
}) {
  const thread = useQuery(
    api.members.adminListThread,
    userId ? { userId } : "skip",
  );
  const reply = useMutation(api.members.adminReply);
  const markRead = useMutation(api.members.adminMarkThreadRead);
  const setStatus = useMutation(api.members.adminSetMemberStatus);
  const deleteMember = useMutation(api.members.adminDeleteMember);
  const deleteMessage = useMutation(api.members.adminDeleteMessage);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const profile = thread?.profile;
  const messages = thread?.messages ?? [];
  const pending = messages.filter((m) => m.sender === "member" && m.read !== true).length;

  const onReply = async () => {
    const body = draft.trim();
    if (!body || !userId || busy) return;
    setBusy(true);
    const ok = await runAction(
      () => reply({ userId, body }),
      "Reply sent to the member.",
      toast,
    );
    if (ok) setDraft("");
    setBusy(false);
  };

  const onToggleStatus = async () => {
    if (!profile || !profile.userId) return;
    const next = profile.status === "disabled" ? "active" : "disabled";
    const label = next === "disabled" ? "disable" : "re-enable";
    if (!confirmAction(`Are you sure you want to ${label} this member?`)) return;
    await runAction(
      () => setStatus({ userId: profile.userId, status: next }),
      next === "disabled" ? "Member disabled." : "Member re-enabled.",
      toast,
    );
  };

  const onDeleteMember = async () => {
    if (!profile?.userId) return;
    if (
      !confirmAction(
        "Remove this community account? Their profile, messages, notifications and saved items will be permanently deleted.",
      )
    )
      return;
    const ok = await runAction(
      () => deleteMember({ userId: profile.userId }),
      "Community account removed.",
      toast,
    );
    if (ok) onClose();
  };

  return (
    <Dialog
      open={userId !== null}
      onOpenChange={(open) => {
        if (!open) {
          setDraft("");
          onClose();
        }
      }}
    >
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-4">
        {thread === undefined && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}

        {profile && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {profile.photo ? (
                  <img
                    src={profile.photo}
                    alt=""
                    className="size-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-ember to-clay text-sm font-bold text-white">
                    {initials(profile.displayName)}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate font-display">
                    {profile.displayName}
                  </span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {profile.email || "No email"} ·{" "}
                    {profile.createdAt
                      ? `joined ${formatDate(profile.createdAt)}`
                      : ""}
                  </span>
                </span>
              </DialogTitle>
            </DialogHeader>

            {/* Profile summary */}
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={profile.status} />
              {profile.bio ? (
                <p className="w-full text-sm leading-relaxed text-muted-foreground">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">No bio provided.</p>
              )}
            </div>

            {/* Conversation */}
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Conversation
                </p>
                {pending > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-full text-xs"
                    onClick={() =>
                      runAction(
                        () => markRead({ userId: profile.userId }),
                        `${pending} message${pending === 1 ? "" : "s"} marked read.`,
                        toast,
                      )
                    }
                  >
                    <CheckCheck className="size-3.5" />
                    Mark {pending} unread as read
                  </Button>
                )}
              </div>

              <div className="max-h-[40vh] min-h-40 space-y-3 overflow-y-auto rounded-xl border border-border/60 bg-background/40 p-4">
                {messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No messages yet — this member hasn't reached out.
                  </p>
                ) : (
                  messages.map((message: MemberMessageDoc) => (
                    <div
                      key={message._id}
                      className={cn(
                        "group flex items-start gap-2",
                        message.sender === "admin" && "justify-end",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3.5 py-2.5",
                          message.sender === "admin"
                            ? "bg-ember text-white"
                            : "border border-border/70 bg-card text-foreground",
                        )}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                          {message.body}
                        </p>
                        <div
                          className={cn(
                            "mt-1 flex items-center gap-2 text-[10px]",
                            message.sender === "admin"
                              ? "text-white/75"
                              : "text-muted-foreground",
                          )}
                        >
                          <span>{bubbleTime(message.createdAt)}</span>
                          {message.sender === "member" && (
                            <span
                              className={
                                message.read === true
                                  ? "text-sage"
                                  : "text-ember"
                              }
                            >
                              {message.read === true ? "Read" : "Unread"}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                        aria-label="Remove message"
                        title="Remove this message"
                        onClick={() =>
                          confirmAction("Remove this message permanently?") &&
                          runAction(
                            () => deleteMessage({ id: message._id }),
                            "Message removed.",
                            toast,
                          )
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Reply composer */}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && draft.trim()) {
                      e.preventDefault();
                      void onReply();
                    }
                  }}
                  rows={2}
                  maxLength={2000}
                  placeholder="Reply to this member… (Enter to send)"
                  className="min-h-14 resize-none bg-background"
                />
                <Button
                  onClick={() => void onReply()}
                  disabled={busy || !draft.trim()}
                  className="shrink-0 rounded-full bg-ember text-white hover:brightness-110"
                >
                  <Send className="size-4" />
                  Reply
                </Button>
              </div>
            </div>

            {/* Danger zone */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => void onToggleStatus()}
              >
                {profile.status === "disabled"
                  ? "Re-enable account"
                  : "Disable account"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-destructive hover:text-destructive"
                onClick={() => void onDeleteMember()}
              >
                <Trash2 className="size-4" />
                Remove account
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function UpdatesPanel() {
  const updates = useQuery(api.members.adminListUpdates);
  const createUpdate = useMutation(api.members.adminCreateUpdate);
  const deleteUpdate = useMutation(api.members.adminDeleteUpdate);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("update");
  const [busy, setBusy] = useState(false);

  const onPublish = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Both a title and a body are required.");
      return;
    }
    setBusy(true);
    const ok = await runAction(
      () => createUpdate({ title: title.trim(), body: body.trim(), kind }),
      "Published — every member gets a notification.",
      toast,
    );
    if (ok) {
      setTitle("");
      setBody("");
      setKind("update");
    }
    setBusy(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      {/* Publish */}
      <Card className="h-fit border-border/70 bg-card/60">
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="font-display text-base font-semibold">
              Publish an update
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Members see it in their area and receive a notification.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cu-title">Title</Label>
            <Input
              id="cu-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="New video this Friday"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cu-kind">Type</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger id="cu-kind" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="update">Creator update</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cu-body">Body</Label>
            <Textarea
              id="cu-body"
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              placeholder="What should the community know?"
            />
          </div>
          <Button
            onClick={() => void onPublish()}
            disabled={busy}
            className="rounded-full bg-ember text-white hover:brightness-110"
          >
            <Megaphone className="size-4" />
            {busy ? "Publishing…" : "Publish to members"}
          </Button>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-3">
        {updates === undefined ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))
        ) : updates.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
            No updates published yet.
          </p>
        ) : (
          updates.map((update: CreatorUpdateDoc) => (
            <Card
              key={update._id}
              className="border-border/70 bg-card/60 transition-colors hover:border-ember/30"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize",
                          update.kind === "announcement"
                            ? "border-gold/30 bg-gold/15 text-gold"
                            : "border-ember/30 bg-ember/15 text-ember",
                        )}
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
                        {formatDate(update.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 font-semibold text-foreground">
                      {update.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {update.body}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Delete update"
                    onClick={() =>
                      confirmAction(
                        "Delete this update? Members will no longer see it.",
                      ) &&
                      runAction(
                        () => deleteUpdate({ id: update._id }),
                        "Update deleted.",
                        toast,
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

/** Admin studio: community members, their conversations and creator updates. */
export default function AdminMembers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<Id<"users"> | null>(null);

  const members = useQuery(api.members.adminListMembers, { search, page });
  const unreadTotal = useQuery(api.members.adminUnreadCount) ?? 0;

  const items = members?.items ?? [];
  const total = members?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <div>
      <AdminPageHeader
        title="Members"
        description="Community members, private conversations and creator updates."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-ember/30 bg-ember/10 px-4 py-2 text-sm font-semibold text-ember">
            <Bell className="size-4" />
            {unreadTotal} unread
          </span>
        }
      />

      <Tabs defaultValue="members">
        <TabsList className="mb-4">
          <TabsTrigger value="members">
            <UserRound className="size-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="updates">
            <Megaphone className="size-4" />
            Creator updates
          </TabsTrigger>
        </TabsList>

        {/* ---------------- Members ---------------- */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-56">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, email or bio…"
                className="pl-9"
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {total} member{total === 1 ? "" : "s"}
            </span>
          </div>

          <Card className="border-border/70 bg-card/60">
            <CardContent className="p-0">
              {members === undefined ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  {search
                    ? "No members match that search."
                    : "No community members yet — they appear here right after signing up."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead>Member</TableHead>
                      <TableHead className="hidden md:table-cell">
                        Last message
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Unread
                      </TableHead>
                      <TableHead className="text-right">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row) => (
                      <TableRow
                        key={row.profile._id}
                        className="cursor-pointer border-border/50"
                        onClick={() => setSelectedId(row.profile.userId)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {row.profile.photo ? (
                              <img
                                src={row.profile.photo}
                                alt=""
                                className="size-8 rounded-full object-cover"
                              />
                            ) : (
                              <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-ember to-clay text-xs font-bold text-white">
                                {initials(row.profile.displayName)}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {row.profile.displayName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {row.profile.email || "—"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden max-w-56 md:table-cell">
                          <p className="truncate text-sm text-muted-foreground">
                            {row.lastMessage
                              ? row.lastMessage.body
                              : "No messages yet"}
                          </p>
                          {row.lastMessage && (
                            <p className="text-xs text-muted-foreground/70">
                              {timeAgo(row.lastMessage.createdAt)}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.profile.status} />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {row.unread > 0 ? (
                            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-ember px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {row.unread}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatDate(row.profile.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {pages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ---------------- Creator updates ---------------- */}
        <TabsContent value="updates">
          <UpdatesPanel />
        </TabsContent>
      </Tabs>

      <MemberDetailDialog
        userId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
