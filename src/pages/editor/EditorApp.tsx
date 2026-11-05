import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { useAccentColors, useSettingsTheme } from "@/lib/accents";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRoundX,
  Video,
  Wallet,
} from "lucide-react";

export type EditorDashboard = NonNullable<
  FunctionReturnType<typeof api.editors.myDashboard>
>;

export interface EditorOutletContext {
  dashboard: EditorDashboard;
}

interface NavEntry {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  badge?: number;
}

function navEntries(pendingRequests: number): NavEntry[] {
  return [
    { to: "/editor", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/editor/videos", label: "My Videos", icon: Video },
    {
      to: "/editor/payments",
      label: "Payments",
      icon: Wallet,
      badge: pendingRequests,
    },
  ];
}

function NavItems({
  entries,
  onNavigate,
}: {
  entries: NavEntry[];
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {entries.map((entry) => {
        const Icon = entry.icon;
        return (
          <NavLink
            key={entry.to}
            to={entry.to}
            end={entry.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-ember/15 text-ember"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )
            }
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{entry.label}</span>
            {entry.badge ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-ember px-1.5 py-0.5 text-[10px] font-bold text-white">
                {entry.badge}
              </span>
            ) : null}
          </NavLink>
        );
      })}
    </nav>
  );
}

/**
 * Private editor area shell. It mirrors the member/admin layout (sidebar on
 * desktop, sheet on mobile) and links the signed-in account to its editor
 * profile by email on first visit.
 */
export default function EditorApp() {
  const settings = useQuery(api.site.getSiteSettings);
  useAccentColors(settings);
  useSettingsTheme(settings?.theme);
  const { user, signOut, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboard = useQuery(api.editors.myDashboard);
  const linkProfile = useMutation(api.editors.linkMyEditorProfile);
  const linkedRef = useRef(false);

  useEffect(() => {
    if (authLoading || dashboard !== null || linkedRef.current) return;
    linkedRef.current = true;
    linkProfile().catch(() => {
      // Leave the profile unlinked — the gate below explains what to do.
    });
  }, [authLoading, dashboard, linkProfile]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || dashboard === undefined) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <Skeleton className="h-10 w-56" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background p-6">
        <div className="warm-glow pointer-events-none absolute inset-0" />
        <Card className="relative w-full max-w-md border-border/70 bg-card/85 text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-ember/15">
              <UserRoundX className="size-5 text-ember" />
            </div>
            <CardTitle className="font-display text-xl">
              No editor profile yet
            </CardTitle>
            <CardDescription>
              This account isn&apos;t linked to an editor profile. Ask the site
              owner to add you as an editor using this email
              {user?.email ? ` (${user.email})` : ""}, then refresh this page.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex-col gap-2">
            <Button asChild className="w-full rounded-full">
              <Link to="/member">Go to the member area</Link>
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" /> Sign in with another account
            </Button>
            <Button asChild variant="ghost" className="w-full rounded-full">
              <Link to="/">Back to site</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (dashboard.editor.status === "disabled") {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background p-6">
        <div className="warm-glow pointer-events-none absolute inset-0" />
        <Card className="relative w-full max-w-md border-border/70 bg-card/85 text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-ember/15">
              <LogOut className="size-5 text-ember" />
            </div>
            <CardTitle className="font-display text-xl">
              Editor account disabled
            </CardTitle>
            <CardDescription>
              Your editor account has been paused, so videos and payouts are
              hidden. Contact the site owner if you think this is a mistake.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex-col gap-2">
            <Button className="w-full rounded-full" onClick={handleSignOut}>
              <LogOut className="size-4" /> Sign out
            </Button>
            <Button asChild variant="ghost" className="w-full rounded-full">
              <Link to="/">Back to site</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const entries = navEntries(dashboard.totals.pendingRequests);
  const firstName =
    dashboard.editor.displayName?.split(/\s+/)[0] ??
    user?.email?.split("@")[0] ??
    "there";

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card/40 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-ember to-clay text-sm font-bold text-white">
            {(settings?.title ?? "R").slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold">
              {settings?.title ?? "Creator Hub"}
            </p>
            <p className="text-[11px] text-muted-foreground">Editor area</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavItems entries={entries} />
        </div>
        <div className="border-t border-border p-3">
          <Button
            asChild
            variant="outline"
            className="w-full justify-between rounded-xl border-border/70"
          >
            <Link to="/">
              View site
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-display">
                  {settings?.title ?? "Editor area"}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-2 px-2">
                <NavItems
                  entries={entries}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>

          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full border border-ember/30 bg-ember/10 px-3 py-1 text-[11px] font-semibold tracking-wider text-ember uppercase">
              Editor
            </span>
            <span className="text-sm text-muted-foreground">
              Welcome back, {firstName}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 md:flex">
              <span className="max-w-40 truncate text-xs text-muted-foreground">
                {dashboard.editor.email ?? user?.email ?? "Signed in"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-muted-foreground hover:text-ember"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet context={{ dashboard }} />
        </main>
      </div>
    </div>
  );
}
