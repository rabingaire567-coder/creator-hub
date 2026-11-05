import { useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  CalendarClock,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill, confirmAction, runAction } from "@/admin/shared";
import { formatDate } from "@/lib/format";
import { formatCount, formatPercent, formatRs } from "@/lib/editor";

type VideoSummary = NonNullable<
  FunctionReturnType<typeof api.editors.adminVideoSummary>
>;
type PaymentRecord = VideoSummary["payments"][number];

function toDateInput(ts?: number | null): string {
  if (!ts) return new Date().toISOString().slice(0, 10);
  return new Date(ts).toISOString().slice(0, 10);
}

function fromDateInput(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(parsed) ? parsed : undefined;
}

function EditPaymentDialog({
  payment,
  onOpenChange,
}: {
  payment: PaymentRecord;
  onOpenChange: () => void;
}) {
  const update = useMutation(api.editors.adminUpdatePayment);
  const [amount, setAmount] = useState(String(payment.amount));
  const [paidAt, setPaidAt] = useState(toDateInput(payment.paidAt));
  const [reference, setReference] = useState(payment.reference ?? "");
  const [notes, setNotes] = useState(payment.notes ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const ok = await runAction(
      () =>
        update({
          paymentId: payment._id,
          patch: {
            amount: Number(amount),
            paidAt: fromDateInput(paidAt),
            reference: reference.trim(),
            notes: notes.trim(),
          },
        }),
      "Payment updated.",
      toast,
    );
    setSaving(false);
    if (ok) onOpenChange();
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display">Edit payment</DialogTitle>
        <DialogDescription>
          Payment records are the audit trail for this editor&apos;s payouts.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="payment-amount">Amount (Rs.)</Label>
            <Input
              id="payment-amount"
              type="number"
              min={0.01}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment-date">Payment date</Label>
            <Input
              id="payment-date"
              type="date"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="payment-reference">Reference</Label>
          <Input
            id="payment-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="eSewa transaction ID"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="payment-notes">Notes</Label>
          <Input
            id="payment-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anything worth remembering"
          />
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button variant="ghost" className="rounded-full" onClick={onOpenChange}>
          Cancel
        </Button>
        <Button className="rounded-full" disabled={saving} onClick={() => void submit()}>
          {saving ? "Saving…" : "Save payment"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/**
 * Per-video earnings panel for the admin studio: assignment summary, live
 * earnings breakdown, per-video rate and the payment records for the video.
 */
export function VideoEarningsPanel({
  postId,
  open,
  onOpenChange,
}: {
  postId: Id<"posts">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const summary = useQuery(
    api.editors.adminVideoSummary,
    open ? { postId } : "skip",
  );
  const assign = useMutation(api.editors.assignVideoToEditor);
  const recordPayment = useMutation(api.editors.adminRecordPayment);
  const deletePayment = useMutation(api.editors.adminDeletePayment);

  const [rate, setRate] = useState("");
  const [savingRate, setSavingRate] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [amount, setAmount] = useState("");
  // Empty until the form is opened (setting today's date on open keeps the
  // component pure during render).
  const [paidAt, setPaidAt] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);

  if (!open) return null;

  const loading = summary === undefined;

  const saveRate = async () => {
    if (!summary || !summary.post.editorId) return;
    setSavingRate(true);
    const ok = await runAction(
      () =>
        assign({
          postId: summary.post._id,
          editorId: summary.post.editorId,
          ratePerThousand: Number(rate),
        }),
      "Video rate updated.",
      toast,
    );
    setSavingRate(false);
    if (ok) setRate("");
  };

  const submitPayment = async () => {
    if (!summary?.editor) return;
    setSavingPayment(true);
    const ok = await runAction(
      () =>
        recordPayment({
          editorId: summary.editor!._id,
          postId: summary.post._id,
          amount: Number(amount || summary.earnings.remaining),
          paidAt: fromDateInput(paidAt),
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
          method: "esewa",
        }),
      "Payment recorded.",
      toast,
    );
    setSavingPayment(false);
    if (ok) {
      setShowPaymentForm(false);
      setAmount("");
      setReference("");
      setNotes("");
    }
  };

  const removePayment = async (payment: PaymentRecord) => {
    if (
      !confirmAction(
        `Delete the ${formatRs(payment.amount)} payment from ${formatDate(payment.paidAt)}? This reduces the amount paid.`,
      )
    )
      return;
    await runAction(
      () => deletePayment({ paymentId: payment._id }),
      "Payment record deleted.",
      toast,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Video earnings</DialogTitle>
          <DialogDescription>
            {summary?.post.title ?? "Loading video…"}
            {summary?.editor ? ` · ${summary.editor.displayName}` : ""}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : summary === null ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            This video no longer exists.
          </p>
        ) : !summary.editor ? (
          <p className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
            No editor is assigned to this video yet. Edit the content and choose
            an editor to start tracking earnings.
          </p>
        ) : (
          <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div className="rounded-lg border border-border/60 bg-background/40 p-2">
                <p className="text-[11px] text-muted-foreground">YouTube views</p>
                <p className="font-medium">
                  {formatCount(summary.earnings.currentViews)}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-2">
                <p className="text-[11px] text-muted-foreground">Likes</p>
                <p className="font-medium">
                  {formatCount(summary.earnings.likes)}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-2">
                <p className="text-[11px] text-muted-foreground">
                  Eligible views
                </p>
                <p className="font-medium">
                  {formatCount(summary.earnings.eligibleViews)}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/40 p-2">
                <p className="text-[11px] text-muted-foreground">
                  Rating (like rate)
                </p>
                <p className="flex items-center gap-1 font-medium text-gold">
                  {summary.earnings.stars}
                  <Star className="size-3 fill-gold text-gold" />
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {formatPercent(summary.earnings.percent)}
                  </span>
                </p>
              </div>
            </div>

            {/* Earnings */}
            <div className="space-y-1.5 rounded-xl border border-border/70 bg-background/40 p-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Initial view snapshot</span>
                <span>{formatCount(summary.post.initialViews)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Base earnings</span>
                <span>{formatRs(summary.earnings.baseEarnings)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">
                  Rating bonus ({summary.earnings.multiplier}×)
                </span>
                <span className="text-sage">
                  +{formatRs(summary.earnings.bonusEarnings)}
                </span>
              </div>
              <div className="flex justify-between gap-2 border-t border-border/60 pt-1.5">
                <span className="font-medium">Total earnings</span>
                <span className="font-semibold">
                  {formatRs(summary.earnings.totalEarnings)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Paid</span>
                <span>{formatRs(summary.earnings.paid)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Remaining payable</span>
                <span className="font-semibold text-ember">
                  {formatRs(summary.earnings.remaining)}
                </span>
              </div>
            </div>

            {/* Rate + sync */}
            <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/40 p-3 sm:flex-row sm:items-end">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="video-rate">Rate per 1,000 views (this video)</Label>
                <Input
                  id="video-rate"
                  type="number"
                  min={0}
                  step="0.01"
                  value={rate || String(summary.post.ratePerThousand)}
                  onChange={(event) => setRate(event.target.value)}
                />
              </div>
              <Button
                variant="outline"
                className="rounded-full"
                disabled={savingRate}
                onClick={() => void saveRate()}
              >
                {savingRate ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Save rate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Assigned {formatDate(summary.post.assignedAt) || "—"} · Last
              YouTube sync{" "}
              {summary.post.syncedAt
                ? formatDate(summary.post.syncedAt)
                : "never"}
              . Changing the rate affects future calculations for this video
              only.
            </p>

            {/* Payments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Payment records</p>                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      setShowPaymentForm((value) => !value);
                      setPaidAt((value) =>
                        value || new Date().toISOString().slice(0, 10),
                      );
                    }}
                  >
                    <Plus className="size-3.5" /> Record payment
                  </Button>
              </div>

              {showPaymentForm && (
                <div className="space-y-3 rounded-xl border border-ember/30 bg-ember/5 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="new-payment-amount">Amount (Rs.)</Label>
                      <Input
                        id="new-payment-amount"
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        placeholder={String(summary.earnings.remaining)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="new-payment-date">Payment date</Label>
                      <Input
                        id="new-payment-date"
                        type="date"
                        value={paidAt}
                        onChange={(event) => setPaidAt(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="new-payment-reference">Reference</Label>
                      <Input
                        id="new-payment-reference"
                        value={reference}
                        onChange={(event) => setReference(event.target.value)}
                        placeholder="eSewa transaction ID"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="new-payment-notes">Notes</Label>
                      <Input
                        id="new-payment-notes"
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full"
                      onClick={() => setShowPaymentForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-full"
                      disabled={savingPayment}
                      onClick={() => void submitPayment()}
                    >
                      {savingPayment ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Wallet className="size-4" />
                      )}
                      Save payment
                    </Button>
                  </div>
                </div>
              )}

              {summary.payments.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/70 p-4 text-center text-sm text-muted-foreground">
                  No payments recorded for this video yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Reference
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.payments.map((payment) => (
                      <TableRow key={payment._id} className="border-border/50">
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(payment.paidAt)}
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-sage">
                          {formatRs(payment.amount)}
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                          {payment.reference || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title="Edit payment"
                              onClick={() => setEditingPayment(payment)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              title="Delete payment"
                              onClick={() => void removePayment(payment)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Requests for this video */}
            {summary.requests.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Payment requests</p>
                {summary.requests.map((request) => (
                  <div
                    key={request._id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm"
                  >
                    <span className="inline-flex items-center gap-2">
                      <CalendarClock className="size-3.5 text-muted-foreground" />
                      {formatRs(request.amount)} · {formatDate(request.createdAt)}
                    </span>
                    <StatusPill status={request.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </DialogContent>

      <Dialog
        open={editingPayment !== null}
        onOpenChange={(value) => {
          if (!value) setEditingPayment(null);
        }}
      >
        {editingPayment && (
          <EditPaymentDialog
            key={editingPayment._id}
            payment={editingPayment}
            onOpenChange={() => setEditingPayment(null)}
          />
        )}
      </Dialog>
    </Dialog>
  );
}
