import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { AdminPageHeader, StatusPill, runAction } from "@/admin/shared";
import { formatDate, timeAgo, truncate } from "@/lib/format";
import { cn } from "@/lib/utils";

type MessageDoc = Doc<"contactMessages">;

const STATUSES = ["new", "replied", "archived"] as const;
const FILTERS = ["all", "new", "replied", "archived"] as const;

/** Admin inbox for contact form messages from /contact. */
export default function AdminMessages() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<Id<"contactMessages"> | null>(null);

  const messages = useQuery(api.contact.listContactMessages, {
    status: filter === "all" ? undefined : filter,
    page,
  });
  // Live document behind the open dialog so status changes reflect instantly.
  const detail = useQuery(
    api.contact.getContactMessageById,
    detailId ? { id: detailId } : "skip",
  );
  const updateMessage = useMutation(api.contact.updateContactMessage);
  const newCount = useQuery(api.contact.countNewContactMessages) ?? 0;

  const items = messages?.items ?? [];
  const total = messages?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));

  const changeStatus = (message: MessageDoc, status: string) =>
    runAction(
      () => updateMessage({ id: message._id, status }),
      `Marked ${status}.`,
      toast,
    );

  return (
    <div>
      <AdminPageHeader
        title="Messages"
        description="Contact form messages — reply straight from your inbox."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-ember/30 bg-ember/10 px-4 py-2 text-sm font-semibold text-ember">
            <Mail className="size-4" />
            {newCount} new
          </span>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((option) => (
          <button
            key={option}
            onClick={() => {
              setFilter(option);
              setPage(1);
            }}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              filter === option
                ? "border-ember/50 bg-ember/15 text-ember"
                : "border-border text-muted-foreground hover:border-ember/30",
            )}
          >
            {option}
          </button>
        ))}
        <span className="ml-auto self-center text-sm text-muted-foreground">
          {total} messages
        </span>
      </div>

      <Card className="border-border/70 bg-card/60">
        <CardContent className="p-0">
          {messages === undefined ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No messages with this filter.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead>From</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Category
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((message) => (
                  <TableRow
                    key={message._id}
                    className="cursor-pointer border-border/50"
                    onClick={() => setDetailId(message._id)}
                  >
                    <TableCell>
                      <p className="font-medium">{message.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {message.email}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate">{message.subject}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {truncate(message.message, 70)}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {message.category}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={message.status ?? "new"}
                        onValueChange={(status) => changeStatus(message, status)}
                      >
                        <SelectTrigger className="h-8 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              <span className="capitalize">{status}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {timeAgo(message.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="size-4" /> Previous
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
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      <Dialog
        open={detailId !== null}
        onOpenChange={(open) => !open && setDetailId(null)}
      >
        {detail === undefined && detailId !== null && (
          <DialogContent className="sm:max-w-lg">
            <p className="text-sm text-muted-foreground">Loading…</p>
          </DialogContent>
        )}
        {detail && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">
                {detail.subject}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{detail.name}</span>
                <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                  {detail.category}
                </span>
                <StatusPill status={detail.status ?? "new"} />
                <span className="text-xs text-muted-foreground">
                  {formatDate(detail.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap rounded-xl border border-border/60 bg-background/40 p-4 text-sm leading-relaxed">
                {detail.message}
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <Select
                  value={detail.status ?? "new"}
                  onValueChange={(status) => changeStatus(detail, status)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        <span className="capitalize">{status}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  asChild
                  className="rounded-full bg-ember text-white hover:brightness-110"
                >
                  <a
                    href={`mailto:${detail.email}?subject=Re: ${encodeURIComponent(
                      detail.subject,
                    )}`}
                  >
                    <Send className="size-4" />
                    Reply
                  </a>
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
