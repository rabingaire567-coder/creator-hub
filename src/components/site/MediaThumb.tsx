import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { toneForCategory } from "@/lib/constants";
import { youtubeThumb } from "@/lib/format";

/**
 * Media thumbnail with layered graceful fallbacks:
 * 1. explicit image URL (admin-managed)
 * 2. auto-generated YouTube thumbnail
 * 3. warm gradient placeholder with the category label — never a broken image.
 */
export function MediaThumb({
  src,
  youtubeId,
  alt,
  category,
  className,
  children,
}: {
  src?: string | null;
  youtubeId?: string | null;
  alt: string;
  category?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const candidate = src?.trim() || youtubeThumb(youtubeId);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [candidate]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        "bg-gradient-to-br from-ember/25 via-gold/15 to-clay/25",
        className,
      )}
      role="img"
      aria-label={alt}
    >
      {candidate && !failed && (
        <img
          src={candidate}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      )}
      {(!candidate || failed) && (
        <div className="grain absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide uppercase backdrop-blur-sm",
              toneForCategory(category),
              "bg-background/40",
            )}
          >
            {category || "Rabin Gaire"}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
