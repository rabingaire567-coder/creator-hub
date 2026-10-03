import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Boxes,
  Building2,
  Code2,
  Compass,
  GraduationCap,
  HeartHandshake,
  MapPin,
  Play,
  Radio,
  Sparkles,
  Telescope,
  Users,
} from "lucide-react";
import { usePageMeta } from "@/lib/seo";
import { formatDate, parseJsonArray, type Stat, DEFAULT_STATS } from "@/lib/format";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";
import { StatCounter } from "@/components/site/StatCounter";
import { MediaThumb } from "@/components/site/MediaThumb";
import { EmptyState } from "@/components/site/EmptyState";
import { SocialLinks } from "@/components/site/SocialLinks";
import { ContentCard } from "@/components/site/ContentCard";
import { ArticleCard } from "@/components/site/ArticleCard";
import { cn } from "@/lib/utils";

const TOPICS = [
  { label: "Technology", icon: Code2 },
  { label: "Programming", icon: Boxes },
  { label: "Nepal", icon: MapPin },
  { label: "Education", icon: GraduationCap },
  { label: "Science", icon: Telescope },
  { label: "Society", icon: Users },
  { label: "Documentary", icon: Radio },
  { label: "Digital creativity", icon: Sparkles },
];

function CtaLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "outline";
  className?: string;
}) {
  const classes =
    variant === "primary"
      ? "bg-gradient-to-r from-ember to-clay text-white shadow-[0_14px_34px_-16px_var(--ember)] hover:brightness-110"
      : "border border-border bg-card/70 text-foreground hover:border-ember/50 hover:text-ember";
  const inner = (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5",
        classes,
        className,
      )}
    >
      {children}
    </span>
  );
  if (href.startsWith("/")) {
    return <Link to={href}>{inner}</Link>;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  );
}

export default function Home() {
  usePageMeta(
    undefined,
    "Exploring ideas, technology, Nepal and the stories behind them — videos, articles and projects by Rabin Gaire.",
  );

  const settings = useQuery(api.site.getSiteSettings);
  const latestPosts = useQuery(api.posts.listLatestPosts);
  const featuredPosts = useQuery(api.posts.listPosts, { featuredOnly: true });
  const articles = useQuery(api.articles.listArticles, { page: 1 });
  const projects = useQuery(api.projects.listProjects, { page: 1 });
  const socialLinks = useQuery(api.social.listSocialLinks);
  const reduced = useReducedMotion();

  // Single source of truth: the admin homepage writes stats/aboutSections/
  // timeline as JSON strings (site.ts) and reads/writes the hero/intro/buttons
  // as plain strings. The public homepage decodes exactly what the admin writes
  // and falls back to the same defaults, so saved homepage values always
  // surface on the live site.
  const stats = parseJsonArray<Stat>(settings?.stats, DEFAULT_STATS);

  const featuredItems =
    (featuredPosts?.items && featuredPosts.items.length > 0
      ? featuredPosts.items
      : latestPosts) ?? [];
  const latestPost = latestPosts?.[0];
  const articleItems = articles?.items ?? [];

  const currentProjectId = settings?.currentProject;
  const currentProject =
    (currentProjectId
      ? (projects?.items ?? []).find((p) => p._id === currentProjectId)
      : undefined) ??
    (projects?.items ?? []).find((p) => p.status === "Building");

  const heroLabel = settings?.heroSubtext || "Creator • Storyteller • Developer";
  const heroHeading =
    settings?.heroHeading ||
    "Exploring ideas, technology, Nepal and the stories behind them.";

  const heroImage =
    typeof settings?.heroImage === "string" && settings.heroImage.trim()
      ? settings.heroImage.trim()
      : latestPost?.thumbnail ?? "";

  const fade = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 26 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay, ease: [0.22, 0.61, 0.36, 1] as const },
        };

  return (
    <>
      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden">
        <div className="warm-glow pointer-events-none absolute inset-0" />
        <div className="grain pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />

        <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-4 pt-32 pb-24 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10 lg:pt-40 lg:pb-32">
          {/* Copy */}
          <div>
            <motion.p
              {...fade(0.05)}
              className="inline-flex items-center gap-2 rounded-full border border-ember/30 bg-ember/10 px-4 py-1.5 text-[11px] font-semibold tracking-[0.24em] text-ember uppercase"
            >
              <span className="size-1.5 rounded-full bg-ember" />
              {heroLabel}
            </motion.p>

            <motion.h1
              {...fade(0.15)}
              className="font-display mt-7 text-[2.6rem] leading-[1.06] font-semibold tracking-tight text-balance text-foreground sm:text-6xl lg:text-[4.1rem]"
            >
              {heroHeading}
            </motion.h1>

            <motion.p
              {...fade(0.28)}
              className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
            >
              {settings?.description ||
                "Documentaries, explainers and field notes on technology, learning and life in Nepal."}
            </motion.p>

            <motion.div {...fade(0.4)} className="mt-9 flex flex-wrap items-center gap-3">
              <CtaLink href={settings?.heroCtaPrimaryHref || "/content"}>
                <Play className="size-4 fill-current" />
                {settings?.heroCtaPrimary || "Watch Latest"}
              </CtaLink>
              <CtaLink
                href={settings?.heroCtaSecondaryHref || "/projects"}
                variant="outline"
              >
                {settings?.heroCtaSecondary || "Explore My Work"}
                <ArrowRight className="size-4" />
              </CtaLink>
            </motion.div>

            <motion.div {...fade(0.5)} className="mt-10">
              <SocialLinks links={socialLinks ?? []} />
            </motion.div>
          </div>

          {/* Cinematic visual */}
          <motion.div
            initial={reduced ? undefined : { opacity: 0, scale: 0.94, rotate: 2 }}
            animate={reduced ? undefined : { opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
            className="relative"
          >
            <div className="absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br from-ember/25 via-gold/10 to-clay/25 blur-3xl" />

            {latestPost ? (
              <Link
                to={`/content/${latestPost._id}`}
                className="group relative block rotate-[-1.5deg] outline-none transition-transform duration-500 hover:rotate-0 focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Watch latest: ${latestPost.title}`}
              >
                <MediaThumb
                  src={latestPost.thumbnail}
                  youtubeId={latestPost.youtubeId}
                  alt={latestPost.title}
                  category={latestPost.categories[0]}
                  className="aspect-video rounded-3xl border border-border shadow-[0_40px_90px_-40px_rgba(0,0,0,0.85)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex size-16 items-center justify-center rounded-full bg-background/80 text-ember shadow-xl transition-transform duration-500 group-hover:scale-110">
                      <Play className="size-6 fill-current ml-0.5" />
                    </span>
                  </span>
                  <span className="absolute top-4 left-4 rounded-full bg-ember px-3 py-1 text-[11px] font-bold tracking-wider text-white uppercase">
                    Latest
                  </span>
                  <div className="absolute right-4 bottom-4 left-4">
                    <p className="line-clamp-1 text-sm font-semibold text-white drop-shadow">
                      {latestPost.title}
                    </p>
                    <p className="mt-0.5 text-xs text-white/70">
                      {formatDate(latestPost.publishedAt ?? latestPost.createdAt)}
                      {latestPost.duration ? ` • ${latestPost.duration}` : ""}
                    </p>
                  </div>
                </MediaThumb>
              </Link>
            ) : (
              <MediaThumb
                src={heroImage}
                alt="Rabin Gaire"
                className="aspect-video rounded-3xl border border-border shadow-[0_40px_90px_-40px_rgba(0,0,0,0.85)]"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-background/80 text-ember shadow-xl transition-transform duration-500 group-hover:scale-110">
                    <Play className="size-6 fill-current ml-0.5" />
                  </div>
                </span>
                <span className="absolute top-4 left-4 rounded-full bg-ember px-3 py-1 text-[11px] font-bold tracking-wider text-white uppercase">
                  Hero
                </span>
              </MediaThumb>
            )}

            {/* Floating chips */}
            {!reduced && (
              <>
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-5 -left-4 hidden rounded-xl border border-border bg-card/90 px-3.5 py-2 text-xs font-semibold text-foreground shadow-lg backdrop-blur sm:block"
                >
                  <span className="mr-1.5 inline-block size-2 rounded-full bg-sage" />
                  Filming • Editing • Shipping
                </motion.div>
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -right-4 -bottom-6 hidden rounded-xl border border-border bg-card/90 px-3.5 py-2 text-xs font-semibold text-foreground shadow-lg backdrop-blur sm:block"
                >
                  <Building2 className="mr-1.5 inline size-3.5 text-gold" />
                  {currentProject ? currentProject.name : "Building in public"}
                </motion.div>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* ============================ INTRO ============================ */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <Reveal>
            <p className="text-xs font-semibold tracking-[0.22em] text-ember uppercase">
              Who's behind this
            </p>
            <h2 className="font-display mt-4 text-4xl leading-tight font-semibold tracking-tight text-foreground sm:text-5xl">
              Hi, I'm
              <br />
              <span className="text-gradient-warm">Rabin Gaire.</span>
            </h2>
            <Link
              to="/about"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ember transition-colors hover:text-clay"
            >
              More about me
              <ArrowUpRight className="size-4" />
            </Link>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="text-lg leading-relaxed text-muted-foreground">
              {settings?.introduction ||
                "I build things with code and tell stories with film — exploring technology, learning, Nepal, education and science, and the human side of them all."}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {TOPICS.map((topic) => (
                <span
                  key={topic.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-ember/40 hover:text-foreground"
                >
                  <topic.icon className="size-3.5 text-ember" />
                  {topic.label}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================ STATS ============================ */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-px px-4 sm:px-6 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Reveal
              key={stat.label}
              delay={index * 0.08}
              className="border-border px-2 py-10 text-center lg:border-r lg:last:border-r-0"
            >
              <p className="font-display text-4xl font-semibold text-foreground sm:text-5xl">
                <StatCounter value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                {stat.label}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================ FEATURED CONTENT ============================ */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Watch"
            title="Featured & latest"
            description="Documentaries, explainers and stories — filmed, written and edited with care."
          />
          <Link
            to="/content"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-ember/50 hover:text-ember"
          >
            View all content
            <ArrowRight className="size-4" />
          </Link>
        </Reveal>

        <div className="mt-10">
          {featuredItems.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredItems.slice(0, 6).map((post, index) => (
                <Reveal key={post._id} delay={index * 0.07}>
                  <ContentCard post={post} className="h-full" />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Play}
              title="The first film is in the works"
              description="Videos will appear here as soon as they're published from the dashboard."
              action={
                <Link
                  to="/community"
                  className="inline-flex items-center gap-2 rounded-full bg-ember px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
                >
                  Suggest a topic
                  <ArrowUpRight className="size-4" />
                </Link>
              }
            />
          )}
        </div>
      </section>

      {/* ============================ ARTICLES ============================ */}
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Read"
            title="From the journal"
            description="Longer-form thinking on technology, education and society."
          />
          <Link
            to="/articles"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-gold/50 hover:text-gold"
          >
            All articles
            <ArrowRight className="size-4" />
          </Link>
        </Reveal>

        <div className="mt-10">
          {articleItems.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articleItems.slice(0, 3).map((article, index) => (
                <Reveal key={article._id} delay={index * 0.07}>
                  <ArticleCard article={article} className="h-full" />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="The journal is being set in type"
              description="Essays and field notes will live here once published."
            />
          )}
        </div>
      </section>

      {/* ============================ CURRENT PROJECT ============================ */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Building"
            title="What I'm building"
            description="Side projects and experiments, shared openly — including what's still broken."
          />
        </Reveal>

        <Reveal delay={0.1} className="mt-10">
          {currentProject ? (
            <div className="group relative overflow-hidden rounded-3xl border border-border bg-card">
              <div className="warm-glow pointer-events-none absolute inset-0 opacity-50" />
              <div className="relative grid gap-8 p-7 sm:p-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-bold tracking-wider text-gold uppercase">
                      {currentProject.status ?? "Building"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {currentProject.category}
                    </span>
                  </div>
                  <h3 className="font-display mt-4 text-3xl font-semibold text-foreground sm:text-4xl">
                    {currentProject.name}
                  </h3>
                  <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
                    {currentProject.description}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      to={`/projects/${currentProject._id}`}
                      className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-ember hover:text-white"
                    >
                      Follow the build
                      <ArrowUpRight className="size-4" />
                    </Link>
                    <Link
                      to="/projects"
                      className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-ember/50 hover:text-ember"
                    >
                      All projects
                    </Link>
                  </div>
                </div>

                <div className="lg:pl-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gold">Progress</span>
                    <span className="font-display text-2xl font-semibold text-foreground tabular-nums">
                      {currentProject.progress ?? 0}%
                    </span>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={reduced ? undefined : { width: 0 }}
                      whileInView={{
                        width: `${Math.min(100, currentProject.progress ?? 0)}%`,
                      }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-gold via-ember to-clay"
                    />
                  </div>
                  {currentProject.technologies.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {currentProject.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Compass}
              title="Something new is taking shape"
              description="Current projects will be showcased here — follow along on the projects page."
              action={
                <Link
                  to="/projects"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-ember/50 hover:text-ember"
                >
                  Browse projects
                </Link>
              }
            />
          )}
        </Reveal>
      </section>

      {/* ============================ COMMUNITY CTA ============================ */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
        <Reveal>              <div className="grain relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-ember/15 via-card to-gold/10 px-7 py-12 text-center sm:px-12">
            <HeartHandshake className="mx-auto size-8 text-ember" />
            <h2 className="font-display mx-auto mt-5 max-w-2xl text-3xl leading-tight font-semibold text-foreground text-balance sm:text-4xl">
              What should I make next?
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted-foreground">
              This platform grows with its community. Share a topic, ask a
              question, or tell me what you're curious about.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/community"
                className="inline-flex items-center gap-2 rounded-full bg-ember px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_-16px_var(--ember)] transition-all hover:-translate-y-0.5 hover:brightness-110"
              >
                Suggest something
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-ember/50 hover:text-ember"
              >
                Work with me
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
