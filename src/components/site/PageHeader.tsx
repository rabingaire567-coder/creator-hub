import { Reveal } from "@/components/site/Reveal";
import { cn } from "@/lib/utils";

/** Warm editorial page header used across the public site. */
export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "relative overflow-hidden border-b border-border",
        className,
      )}
    >
      <div className="warm-glow pointer-events-none absolute inset-0 opacity-70" />
      <div className="grain pointer-events-none absolute inset-0" />
      <div className="relative mx-auto w-full max-w-6xl px-4 pt-32 pb-14 sm:px-6 sm:pt-36">
        <Reveal>
          {eyebrow && (
            <p className="text-xs font-semibold tracking-[0.22em] text-ember uppercase">
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              "font-display mt-3 text-4xl leading-[1.08] font-semibold tracking-tight text-foreground text-balance sm:text-5xl",
            )}
          >
            {title}
          </h1>
          {description && (
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </Reveal>
      </div>
    </header>
  );
}
