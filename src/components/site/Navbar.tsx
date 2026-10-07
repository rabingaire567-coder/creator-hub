import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  LayoutDashboard,
  Menu,
  Search,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { platformIcon } from "@/components/site/SocialLinks";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Home", end: true },
  { to: "/content", label: "Content" },
  { to: "/articles", label: "Articles" },
  { to: "/projects", label: "Projects" },
  { to: "/pdfs", label: "📄 PDFs" },
  { to: "/about", label: "About" },
  { to: "/community", label: "Community" },
];

function Monogram({ name }: { name?: string }) {
  const initials =
    (name ?? "Rabin Gaire")
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "RG";
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ember via-gold to-clay text-sm font-bold text-white shadow-[0_6px_16px_-8px_var(--ember)]">
      {initials}
    </span>
  );
}

/**
 * Sticky minimal navbar: transparent at rest, warm frosted background after
 * scrolling. Desktop shows the full nav; mobile uses an animated sheet drawer.
 */
export function Navbar({ onSearch }: { onSearch: () => void }) {
  const settings = useQuery(api.site.getSiteSettings);
  const socialLinks = useQuery(api.social.listSocialLinks);
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile sheet on any route change (state adjustment during
  // render — avoids a setState-inside-effect cascade).
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setMobileOpen(false);
  }

  const siteName = settings?.logoName || settings?.title || "Rabin Gaire";
  const followLinks = (socialLinks ?? []).filter((l) => l.enabled !== false);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-b border-border bg-background/85 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        {/* Brand */}
        <Link
          to="/"
          className="group flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Monogram name={siteName} />
          <span className="font-display text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-ember">
            {siteName}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  isActive
                    ? "text-ember"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-dot"
                      className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-ember to-gold"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Search */}
          <button
            onClick={onSearch}
            aria-label="Search the site (Ctrl + K)"
            className="hidden items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-sm text-muted-foreground transition-all hover:border-ember/40 hover:text-foreground sm:flex"
          >
            <Search className="size-3.5" />
            <span className="pr-6">Search</span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
              ⌘K
            </kbd>
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full text-muted-foreground hover:text-ember sm:hidden"
            onClick={onSearch}
            aria-label="Search"
          >
            <Search className="size-4" />
          </Button>

          <ThemeToggle />

          {/* Community membership — sign up / login for viewers */}
          <Button
            asChild
            size="sm"
            className="hidden rounded-full bg-ember px-4 text-white hover:brightness-110 sm:inline-flex"
          >
            <Link to={isAuthenticated ? "/member" : "/auth?returnTo=/member"}>
              <Users className="size-3.5" />
              {isAuthenticated ? "Member Area" : "Join Community"}
            </Link>
          </Button>

          {/* Owner studio — routes through RequireAuth to /auth with returnTo */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden rounded-full border-ember/40 text-ember hover:border-ember hover:bg-ember/10 sm:inline-flex"
          >
            <Link to="/admin">
              <LayoutDashboard className="size-3.5" />
              Studio
            </Link>
          </Button>

          {/* Follow */}
          {followLinks.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="hidden rounded-full bg-foreground px-4 text-background hover:bg-ember hover:text-white sm:inline-flex">
                  Follow
                  <ArrowUpRight className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Follow Rabin
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {followLinks.map((link) => {
                  const Icon = platformIcon(link.platform);
                  return (
                    <DropdownMenuItem
                      key={link._id}
                      onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
                    >
                      <Icon className="size-4" />
                      {link.label || link.platform}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-full lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-[82%] flex-col gap-2 border-l border-border bg-background/95 backdrop-blur-xl sm:max-w-sm"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation menu</SheetTitle>
              </SheetHeader>
              <Link
                to="/"
                className="mt-2 flex items-center gap-2.5"
                onClick={() => setMobileOpen(false)}
              >
                <Monogram name={siteName} />
                <span className="font-display text-lg font-semibold text-foreground">
                  {siteName}
                </span>
              </Link>

              <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile">
                {NAV_ITEMS.map((item, index) => (
                  <motion.div
                    key={item.to}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + index * 0.05, duration: 0.35 }}
                  >
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center justify-between rounded-xl px-4 py-3 text-lg font-medium transition-colors",
                          isActive
                            ? "bg-ember/10 text-ember"
                            : "text-foreground hover:bg-muted",
                        )
                      }
                    >
                      {item.label}
                      <ArrowUpRight className="size-4 opacity-40" />
                    </NavLink>
                  </motion.div>
                ))}
              </nav>

              <div className="mt-auto space-y-4 border-t border-border pt-5">
                <NavLink
                  to="/contact"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-lg font-medium text-foreground hover:bg-muted"
                >
                  Contact
                  <ArrowUpRight className="size-4 opacity-40" />
                </NavLink>
                <NavLink
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-lg font-medium text-ember hover:bg-ember/10"
                >
                  Studio
                  <LayoutDashboard className="size-4 opacity-60" />
                </NavLink>
                <NavLink
                  to={isAuthenticated ? "/member" : "/auth?returnTo=/member"}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-lg font-medium text-foreground hover:bg-muted"
                >
                  {isAuthenticated ? "Member Area" : "Join Community"}
                  <Users className="size-4 opacity-60" />
                </NavLink>
                {followLinks.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-1">
                    {followLinks.map((link) => {
                      const Icon = platformIcon(link.platform);
                      return (
                        <a
                          key={link._id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={link.label || link.platform}
                          className="rounded-full border border-border p-2.5 text-muted-foreground transition-colors hover:border-ember/40 hover:text-ember"
                        >
                          <Icon className="size-4" />
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <AnimatePresence />
    </header>
  );
}
