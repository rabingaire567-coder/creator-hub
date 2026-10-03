import type { LucideIcon } from "lucide-react";
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Warm, friendly empty state used across lists, search results and admin
 * tables — never exposes raw technical errors or blank voids.
 */
export function EmptyState({
  icon: Icon = Compass,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-ember/10 text-ember">
        <Icon className="size-5" />
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
