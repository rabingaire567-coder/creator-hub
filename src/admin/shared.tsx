import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Page heading used on every admin screen. */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const PILL_TONES: Record<string, string> = {
  published: "bg-sage/15 text-sage border-sage/30",
  draft: "bg-muted text-muted-foreground border-border",
  new: "bg-ember/15 text-ember border-ember/30",
  replied: "bg-dusk/15 text-dusk border-dusk/30",
  reviewed: "bg-gold/15 text-gold border-gold/30",
  archived: "bg-muted text-muted-foreground border-border",
  Building: "bg-gold/15 text-gold border-gold/30",
  Completed: "bg-sage/15 text-sage border-sage/30",
  Idea: "bg-dusk/15 text-dusk border-dusk/30",
  Archived: "bg-muted text-muted-foreground border-border",
};

/** Small status chip with warm per-status tones. */
export function StatusPill({
  status,
  className,
}: {
  status?: string;
  className?: string;
}) {
  if (!status) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
        PILL_TONES[status] ?? "bg-ember/15 text-ember border-ember/30",
        className,
      )}
    >
      {status}
    </span>
  );
}

/** Native confirm for destructive actions (delete). */
export function confirmAction(message: string): boolean {
  return window.confirm(message);
}

/** Standard save/error toast wrapper used by every admin editor. */
export async function runAction(
  action: () => Promise<unknown>,
  successMessage: string,
  toast: { success: (m: string) => void; error: (m: string) => void },
) {
  try {
    await action();
    toast.success(successMessage);
    return true;
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Something went wrong.",
    );
    return false;
  }
}
