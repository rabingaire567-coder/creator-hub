import {
  Facebook,
  Github,
  Instagram,
  Music2,
  Twitter,
  Youtube,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SocialLinkLike {
  platform: string;
  label?: string;
  url: string;
  enabled?: boolean;
}

const ICONS: Record<string, LucideIcon> = {
  YouTube: Youtube,
  Facebook: Facebook,
  Instagram: Instagram,
  TikTok: Music2,
  GitHub: Github,
  "X (Twitter)": Twitter,
  Twitter: Twitter,
  X: Twitter,
};

export function platformIcon(platform: string): LucideIcon {
  return ICONS[platform] ?? Music2;
}

/**
 * Row of social links driven entirely by the admin-managed socialLinks table —
 * nothing is hardcoded in components.
 */
export function SocialLinks({
  links,
  size = "md",
  showLabels = false,
  className,
}: {
  links: SocialLinkLike[];
  size?: "sm" | "md";
  showLabels?: boolean;
  className?: string;
}) {
  const visible = links.filter((l) => l.enabled !== false && l.url);
  if (visible.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {visible.map((link) => {
        const Icon = platformIcon(link.platform);
        return (
          <a
            key={link.platform + link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label || link.platform}
            title={link.label || link.platform}
            className={cn(
              "group inline-flex items-center gap-2 rounded-full border border-border bg-card text-muted-foreground transition-all duration-300",
              "hover:-translate-y-0.5 hover:border-ember/40 hover:text-ember hover:shadow-[0_6px_20px_-8px_var(--ember)]",
              size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
              showLabels && "font-medium",
            )}
          >
            <Icon className={size === "sm" ? "size-3.5" : "size-4"} />
            {showLabels && <span>{link.label || link.platform}</span>}
          </a>
        );
      })}
    </div>
  );
}
