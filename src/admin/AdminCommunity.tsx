import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Mail, Trash2, Users } from "lucide-react";
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
import { AdminPageHeader, StatusPill, confirmAction, runAction } from "@/admin/shared";
import { timeAgo, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type SubmissionDoc = Doc<"communitySubmissions">;

const STATUSES = ["new", "reviewed", "archived"] as const;
const FILTERS = ["all", "new", "reviewed", "archived"] as const;

/** Admin inbox for community idea submissions from /community. */
export default function AdminCommunity() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<Id<"communitySubmissions"> | null>(
    null,
  );

  const submissions = useQuery(api.community.listCommunitySubmissions, {
    status: filter === "all" ? undefined : filter,
    page,
  });
  // Live document behind the open dialog so status changes reflect instantly.
  const detail = useQuery(
    api.community.getSubmissionById,
    detailId ? { id: detailId } : "skip",
  );
  const updateSubmission = useMutation(api.community.updateSubmission);
  const deleteSubmission = useMutation(api.community.deleteSubmission);

  const items = submissions?.items ?? [];
  const total = submissions?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));

  const changeStatus = (submission: SubmissionDoc, status: string) =>
    runAction(
      () => updateSubmission({ id: submission._id, status }),
      `Marked ${status}.`,
      toast,
    );

  const removeSubmission = (submission: SubmissionDoc) => {
    if (
      !confirmAction(
        "Remove this submission permanently? This cannot be undone.",
      )
    )
      return;
    runAction(
      () => deleteSubmission({ id: submission._id }),
      "Submission removed.",
      toast,
    ).then((ok) => {
      if (ok) setDetailId(null);
    });
  };

  return (
    <div>
      <AdminPageHeader
        title="Community"
        description="Ideas and suggestions submitted by visitors on /community."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            {total} submissions
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
      </div>

      <Card className="border-border/70 bg-card/60">
        <CardContent className="p-0">
          {submissions === undefined ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No submissions here.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead>From</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Suggestion
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Category
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((submission) => (
                  <TableRow
                    key={submission._id}
                    className="cursor-pointer border-border/50"
                    onClick={() => setDetailId(submission._id)}
                  >
                    <TableCell>
                      <p className="font-medium">{submission.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {submission.email}
                      </p>
                    </TableCell>
                    <TableCell className="hidden max-w-sm md:table-cell">
                      <p className="truncate">{submission.suggestion}</p>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {submission.category}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={submission.status ?? "new"}
                        onValueChange={(status) =>
                          changeStatus(submission, status)
                        }
                      >
                        <SelectTrigger className="h-8 w-32 text-xs">
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
                      {timeAgo(submission.createdAt)}
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
                {detail.category} idea
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="whitespace-pre-wrap rounded-xl border border-border/60 bg-background/40 p-4 text-sm leading-relaxed">
                {detail.suggestion}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{detail.name}</p>
                  <a
                    href={`mailto:${detail.email}`}
                    className="inline-flex items-center gap-1 text-ember hover:underline"
                  >
                    <Mail className="size-3.5" />
                    {detail.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={detail.status ?? "new"} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(detail.createdAt)}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-destructive hover:text-destructive"
                  onClick={() => removeSubmission(detail)}
                >
                  <Trash2 className="size-4" />
                  Remove
                </Button>
                <Select
                  value={detail.status ?? "new"}
                  onValueChange={(status) => changeStatus(detail, status)}
                >
                  <SelectTrigger className="w-40">
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
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
