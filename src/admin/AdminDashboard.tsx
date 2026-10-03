import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  FileText,
  FolderGit2,
  Mail,
  MessageSquareHeart,
  PenLine,
  Play,
  Settings2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader, StatusPill } from "@/admin/shared";
import { timeAgo } from "@/lib/format";

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  to,
  tone,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  tone: string;
}) {
  return (
    <Card className="group relative overflow-hidden border-border/70 bg-card/60 transition-colors hover:border-ember/40">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {label}
            </p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-tight">
              {value}
            </p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <span
            className={`flex size-10 items-center justify-center rounded-xl ${tone}`}
          >
            <Icon className="size-5" />
          </span>
        </div>
        <Link
          to={to}
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-ember opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        >
          Open <ArrowRight className="size-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

/** Admin home: counts, inbox previews and quick actions. */
export default function AdminDashboard() {
  const posts = useQuery(api.posts.listPosts, { includeDrafts: true, page: 1 });
  const articles = useQuery(api.articles.listArticles, {
    includeDrafts: true,
    page: 1,
  });
  const projects = useQuery(api.projects.listProjects, {
    includeDrafts: true,
    page: 1,
  });
  const messages = useQuery(api.contact.listContactMessages, { page: 1 });
  const submissions = useQuery(api.community.listCommunitySubmissions, {
    page: 1,
  });
  const newMessages = useQuery(api.contact.countNewContactMessages) ?? 0;
  const newSubmissions = useQuery(api.community.countNewSubmissions) ?? 0;

  const recentMessages = messages?.items.slice(0, 5) ?? [];
  const recentSubmissions = submissions?.items.slice(0, 5) ?? [];

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        description="Everything happening across your site, at a glance."
        actions={
          <>
            <Link
              to="/admin/homepage"
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-ember/50 hover:text-ember"
            >
              <Settings2 className="size-4" />
              Edit homepage
            </Link>
            <Link
              to="/admin/content"
              className="inline-flex items-center gap-2 rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              <PenLine className="size-4" />
              Create content
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Content"
          value={posts?.total ?? "–"}
          hint="Videos & posts"
          icon={Play}
          to="/admin/content"
          tone="bg-ember/15 text-ember"
        />
        <StatCard
          label="Articles"
          value={articles?.total ?? "–"}
          hint="Editorial pieces"
          icon={FileText}
          to="/admin/articles"
          tone="bg-gold/15 text-gold"
        />
        <StatCard
          label="Projects"
          value={projects?.total ?? "–"}
          hint="Portfolio work"
          icon={FolderGit2}
          to="/admin/projects"
          tone="bg-sage/15 text-sage"
        />
        <StatCard
          label="Messages"
          value={newMessages}
          hint="Awaiting reply"
          icon={Mail}
          to="/admin/messages"
          tone="bg-clay/15 text-clay"
        />
        <StatCard
          label="Submissions"
          value={newSubmissions}
          hint="Fresh ideas"
          icon={MessageSquareHeart}
          to="/admin/community"
          tone="bg-dusk/15 text-dusk"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Contact messages */}
        <Card className="border-border/70 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between font-display text-base">
              Recent messages
              <Link
                to="/admin/messages"
                className="text-xs font-semibold text-ember hover:underline"
              >
                View all
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentMessages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No messages yet — they'll land here as soon as someone reaches
                out.
              </p>
            )}
            {recentMessages.map((message) => (
              <div
                key={message._id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {message.subject}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {message.name} · {message.category}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusPill status={message.status ?? "new"} />
                  <span className="text-[11px] text-muted-foreground">
                    {timeAgo(message.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Community submissions */}
        <Card className="border-border/70 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between font-display text-base">
              Recent submissions
              <Link
                to="/admin/community"
                className="text-xs font-semibold text-ember hover:underline"
              >
                View all
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSubmissions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Community ideas will show up here.
              </p>
            )}
            {recentSubmissions.map((submission) => (
              <div
                key={submission._id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {submission.suggestion}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {submission.name} · {submission.category}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusPill status={submission.status ?? "new"} />
                  <span className="text-[11px] text-muted-foreground">
                    {timeAgo(submission.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
