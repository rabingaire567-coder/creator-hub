// Client-side helpers for the video editor programme: money formatting,
// Creator Hub rating labels, eSewa QR compression and the WhatsApp
// click-to-chat message used to request a manual payout.

/** Rs. 1,234.50 — always two decimals for money balances. */
export function formatRs(amount?: number | null): string {
  const value = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return `Rs. ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** 12,340 — plain grouped integers for views/likes. */
export function formatCount(value?: number | null): string {
  const number = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return number.toLocaleString("en-US");
}

export function formatPercent(value?: number | null): string {
  const percent = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return `${percent.toFixed(2)}%`;
}

export function starLabel(stars: number): string {
  return `${stars} / 5`;
}

// ---------------------------------------------------------------------------
// WhatsApp click-to-chat
// ---------------------------------------------------------------------------

/**
 * Builds a wa.me click-to-chat URL. Returns null when the admin hasn't set a
 * number yet, so the UI can explain what is missing instead of opening a
 * broken link.
 */
export function buildWhatsAppUrl(
  number: string | undefined | null,
  message: string,
): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (digits.length < 7) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export interface PaymentMessageInput {
  editorName: string;
  videoTitle: string;
  youtubeUrl?: string | null;
  eligibleViews: number;
  rating: number;
  totalEarnings: number;
  paid: number;
  requestedAmount: number;
}

/** Payment request message containing every figure the admin needs. */
export function buildPaymentRequestMessage(input: PaymentMessageInput): string {
  const lines = [
    "Hello! I'd like to request a payment for a video I edited on Creator Hub.",
    "",
    `Editor: ${input.editorName}`,
    `Video: ${input.videoTitle}`,
  ];
  if (input.youtubeUrl) lines.push(`YouTube link: ${input.youtubeUrl}`);
  lines.push(
    `Eligible views: ${formatCount(input.eligibleViews)}`,
    `Creator Hub rating: ${starLabel(input.rating)} (calculated from likes ÷ views)`,
    `Total earnings: ${formatRs(input.totalEarnings)}`,
    `Already paid: ${formatRs(input.paid)}`,
    `Requested amount: ${formatRs(input.requestedAmount)}`,
    "",
    "My eSewa QR code is included in the payment request on Creator Hub.",
  );
  return lines.join("\n");
}

/** Convenience: message + URL, or a null URL when WhatsApp isn't configured. */
export function buildPaymentRequestLink(
  number: string | undefined | null,
  input: PaymentMessageInput,
): { message: string; url: string | null } {
  const message = buildPaymentRequestMessage(input);
  return { message, url: buildWhatsAppUrl(number, message) };
}
