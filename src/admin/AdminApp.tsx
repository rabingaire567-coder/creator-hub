import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
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
import {
  ArrowUpRight,
  FileText,
  Files,
  FolderGit2,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  PanelTop,
  Plus,
  Settings,
  ShieldAlert,
  Share2,
  Tag,
  Users,
  UsersRound,
  Video,
} from "lucide-react";

interface NavEntry {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  badge?: number;
}

function navEntries(
  newMessages: number,
  newSubmissions: number,
  newMemberMessages: number,
): NavEntry[] {
  return [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/content", label: "Content", icon: Video },
    { to: "/admin/articles", label: "Articles", icon: FileText },
    { to: "/admin/projects", label: "Projects", icon: FolderGit2 },
    { to: "/admin/pdfs", label: "📄 PDF Library", icon: Files },
    { to: "/admin/tags", label: "Tags", icon: Tag },
    { to: "/admin/social", label: "Social links", icon: Share2 },
    { to: "/admin/homepage", label: "Homepage Settings", icon: PanelTop },
    {
      to: "/admin/community",
      label: "Community",
      icon: Users,
      badge: newSubmissions,
    },
    {
      to: "/admin/members",
      label: "Members",
      icon: UsersRound,
      badge: newMemberMessages,
    },
    { to: "/admin/messages", label: "Messages", icon: Mail, badge: newMessages },
    { to: "/admin/settings", label: "Settings", icon: Settings },
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
 * Admin studio shell: fixed sidebar (sheet on mobile), top bar with site
 * links / theme control / sign-out, and the routed screen area.
 */
export default function AdminApp() {
  const settings = useQuery(api.site.getSiteSettings);
  useAccentColors(settings);
  useSettingsTheme(settings?.theme);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const newMessages = useQuery(api.contact.countNewContactMessages) ?? 0;
  const newSubmissions = useQuery(api.community.countNewSubmissions) ?? 0;
  const newMemberMessages = useQuery(api.members.adminUnreadCount) ?? 0;
  const isOwner = useQuery(api.site.isAdmin);
  const entries = navEntries(newMessages, newSubmissions, newMemberMessages);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // A second signed-in account (after the owner email is set) gets a clean
  // access-denied screen instead of failing admin queries downstream.
  if (isOwner === false) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background p-6">
        <div className="warm-glow pointer-events-none absolute inset-0" />
        <Card className="relative w-full max-w-md border-border/70 bg-card/85 text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-ember/15">
              <ShieldAlert className="size-5 text-ember" />
            </div>
            <CardTitle className="font-display text-xl">
              Owner access only
            </CardTitle>
            <CardDescription>
              The studio is limited to the owner account
              {settings?.adminEmail ? ` (${settings.adminEmail})` : ""}. Sign out
              and sign in with the owner email to continue.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex-col gap-2">
            <Button
              className="w-full rounded-full"
              onClick={handleSignOut}
            >
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

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card/40 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-ember to-clay text-sm font-bold text-white">
            {(settings?.title ?? "R").slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold">
              {settings?.title ?? "Studio"}
            </p>
            <p className="text-[11px] text-muted-foreground">Creator studio</p>
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

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          {/* Mobile menu */}
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
                  {settings?.title ?? "Studio"}
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
              Studio
            </span>
            <span className="text-sm text-muted-foreground">
              Manage your site, content and inbox
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden rounded-full sm:inline-flex"
            >
              <Link to="/admin/content">
                <Plus className="size-4" />
                New content
              </Link>
            </Button>
            <ThemeToggle />
            <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 md:flex">
              <span className="max-w-40 truncate text-xs text-muted-foreground">
                {user?.email ?? "Signed in"}
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
