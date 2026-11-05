import { useState } from "react";
import { useOutletContext } from "react-router";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Clock,
  ImageIcon,
  ReceiptText,
  Star,
  Wallet,
  XCircle,
} from "lucide-react";
import type { EditorOutletContext } from "./EditorApp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { confirmAction } from "@/admin/shared";
import { formatDate } from "@/lib/format";
import { formatCount, formatRs } from "@/lib/editor";
import { cn } from "@/lib/utils";

type PaymentRequestRow = EditorOutletContext["dashboard"]["requests"][number];

const REQUEST_TONE: Record<string, string> = {
  pending: "border-gold/30 bg-gold/15 text-gold",
  paid: "border-sage/30 bg-sage/15 text-sage",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  cancelled: "border-border bg-muted text-muted-foreground",
};

/** Shows the uploaded eSewa QR in a dialog (data: URLs cannot be navigated). */
function QrPreview({ requestId }: { requestId: PaymentRequestRow["_id"] }) {
  const [open, setOpen] = useState(false);
  const qr = useQuery(
    api.editors.myPaymentRequestQr,
    open ? { requestId } : "skip",
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        className="inline-flex items-center gap-1 text-ember hover:underline"
        onClick={() => setOpen(true)}
      >
        <ImageIcon className="size-3.5" /> View eSewa QR
      </button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">eSewa QR code</DialogTitle>
        </DialogHeader>
        {qr === undefined ? (
          <Skeleton className="mx-auto aspect-square w-full max-w-64" />
        ) : qr === null ? (
          <p className="text-sm text-muted-foreground">
            No QR code was attached to this request.
          </p>
        ) : (
          <img
            src={qr}
            alt="eSewa QR code"
            className="mx-auto max-h-80 rounded-xl border border-border/70 bg-white object-contain p-2"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RequestCard({ request }: { request: PaymentRequestRow }) {
  const cancel = useMutation(api.editors.cancelPaymentRequest);
  const [busy, setBusy] = useState(false);

  const handleCancel = async () => {
    if (!confirmAction("Cancel this payment request?")) return;
    setBusy(true);
    try {
      await cancel({ requestId: request._id });
      toast.success("Payment request cancelled.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't cancel the request.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-border/70 bg-card/60">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{request.videoTitle}</p>
            <p className="text-xs text-muted-foreground">
              Requested {formatDate(request.createdAt) || "—"}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
              REQUEST_TONE[request.status] ??
                "border-border bg-muted text-muted-foreground",
            )}
          >
            {request.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div>
            <p className="text-[11px] text-muted-foreground">Requested</p>
            <p className="font-semibold text-ember">
              {formatRs(request.amount)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Eligible views</p>
            <p className="font-medium">{formatCount(request.eligibleViews)}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Rating</p>
            <p className="flex items-center gap-1 font-medium text-gold">
              {request.rating}
              <Star className="size-3 fill-gold text-gold" />
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Earnings</p>
            <p className="font-medium">{formatRs(request.totalEarnings)}</p>
          </div>
        </div>

        {(request.note || request.adminNote) && (
          <div className="space-y-1 rounded-lg border border-border/60 bg-background/40 p-2.5 text-xs">
            {request.note && (
              <p>
                <span className="text-muted-foreground">Your note: </span>
                {request.note}
              </p>
            )}
            {request.adminNote && (
              <p>
                <span className="text-muted-foreground">Owner: </span>
                {request.adminNote}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {request.hasQr ? (
              <QrPreview requestId={request._id} />
            ) : (
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="size-3.5" /> No QR attached
              </span>
            )}
            {request.reviewedAt && (
              <span>Reviewed {formatDate(request.reviewedAt)}</span>
            )}
          </div>
          {request.status === "pending" && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => void handleCancel()}
            >
              <XCircle className="size-4" /> Cancel request
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Payment requests and the append-only payout history. */
export default function EditorPayments() {
  const { dashboard } = useOutletContext<EditorOutletContext>();
  const { requests, payments, totals, settings } = dashboard;
  const pending = requests.filter((request) => request.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Payments
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Payouts are handled manually by the owner. Your requests and every
          recorded payment are listed here.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Outstanding
            </p>
            <p className="font-display text-xl font-semibold text-ember">
              {formatRs(totals.outstanding)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Total paid
            </p>
            <p className="font-display text-xl font-semibold text-sage">
              {formatRs(totals.totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Pending requests
            </p>
            <p className="font-display text-xl font-semibold text-gold">
              {pending.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Minimum payout
            </p>
            <p className="font-display text-xl font-semibold">
              {formatRs(settings.minPayout)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Clock className="size-4 text-gold" /> Payment requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
              No payment requests yet. Open My Videos and request a payout once
              a video has{" "}
              {formatRs(settings.minPayout)} or more outstanding.
            </p>
          ) : (
            requests.map((request) => (
              <RequestCard key={request._id} request={request} />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <ReceiptText className="size-4 text-sage" /> Payment history
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No payments recorded yet. Every payout the owner records will show
              up here as an auditable record.
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
                  <TableHead className="hidden md:table-cell">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment._id} className="border-border/50">
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(payment.paidAt)}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-sm">
                      {payment.videoTitle}
                    </TableCell>
                    <TableCell className="font-semibold text-sage">
                      {formatRs(payment.amount)}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {payment.reference || "—"}
                    </TableCell>
                    <TableCell className="hidden max-w-64 truncate text-sm text-muted-foreground md:table-cell">
                      {payment.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/40">
        <CardContent className="flex items-start gap-3 p-4 text-xs text-muted-foreground">
          <Wallet className="mt-0.5 size-4 shrink-0 text-ember" />
          <p>
            Creator Hub never moves money automatically and has no access to
            eSewa. The owner pays you directly, then records the payment here so
            your outstanding balance stays accurate.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
