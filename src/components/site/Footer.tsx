import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Heart } from "lucide-react";
import { SocialLinks } from "@/components/site/SocialLinks";

const EXPLORE = [
  { to: "/content", label: "Content" },
  { to: "/articles", label: "Articles" },
  { to: "/projects", label: "Projects" },
];

const COMPANY = [
  { to: "/about", label: "About" },
  { to: "/community", label: "Community" },
  { to: "/contact", label: "Contact" },
];

function LinkColumn({
  title,
  links,
}: {
  title: string;
  links: { to: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold tracking-[0.2em] text-ember uppercase">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const settings = useQuery(api.site.getSiteSettings);
  const socialLinks = useQuery(api.social.listSocialLinks);
  const siteName = settings?.title || "Rabin Gaire";

  return (
    <footer className="relative mt-24 border-t border-border bg-card/40">
      <div className="warm-glow pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div className="max-w-xs">
            <p className="font-display text-2xl font-semibold text-foreground">
              {siteName}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {settings?.tagline ||
                "Exploring ideas, technology, Nepal and the stories behind them."}
            </p>
            <SocialLinks links={socialLinks ?? []} size="sm" className="mt-5" />
          </div>

          <LinkColumn title="Explore" links={EXPLORE} />
          <LinkColumn title="More" links={COMPANY} />

          <div>
            <h3 className="text-xs font-semibold tracking-[0.2em] text-ember uppercase">
              Newsletter
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Occasional notes on new videos, articles and projects — no noise.
            </p>
            <Link
              to="/community"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-ember/40 hover:text-ember"
            >
              Stay in the loop
            </Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>{settings?.footerText || `© ${new Date().getFullYear()} ${siteName}. Built with care.`}</p>
          <p className="inline-flex items-center gap-1.5">
            Made with <Heart className="size-3 fill-ember text-ember" /> in Nepal
          </p>
        </div>
      </div>
    </footer>
  );
}
