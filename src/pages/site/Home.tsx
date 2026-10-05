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
  Youtube,
} from "lucide-react";
import { usePageMeta } from "@/lib/seo";
import { parseJsonArray, type Stat, DEFAULT_STATS } from "@/lib/format";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";
import { StatCounter } from "@/components/site/StatCounter";
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
  const latestVideos = useQuery(api.posts.listLatestVideos);
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

  // The "Latest videos" grid at the top already shows the newest posts, so
  // the Featured section below falls back to older published videos instead
  // of repeating the same cards — and hides only when there is nothing
  // unique left to show.
  const latestVideoItems = latestVideos ?? [];
  const latestVideoIds = new Set(latestVideoItems.map((post) => post._id));
  const featuredOnlyItems = featuredPosts?.items ?? [];
  const featuredItems =
    featuredOnlyItems.length > 0
      ? featuredOnlyItems
      : (latestPosts ?? []).filter((post) => !latestVideoIds.has(post._id));
  const showFeaturedSection =
    featuredItems.length > 0 || latestVideoItems.length === 0;
  const articleItems = articles?.items ?? [];

  const currentProjectId = settings?.currentProject;
  const currentProject =
    (currentProjectId
      ? (projects?.items ?? []).find((p) => p._id === currentProjectId)
      : undefined) ??
    (projects?.items ?? []).find((p) => p.status === "Building");

  const heroLabel = settings?.heroSubtext || "Creator • Storyteller • Developer";

  // ---- Creator introduction (top of the homepage) ----
  // Every value is managed from Admin → Homepage Settings (photo via the
  // Convex image upload) and falls back to the classic site settings so the
  // section always renders.
  const creatorName =
    settings?.creatorName?.trim() || settings?.title || "Rabin Gaire";
  const creatorTagline =
    settings?.creatorTagline?.trim() ||
    settings?.heroHeading ||
    settings?.tagline ||
    "Exploring ideas, technology, Nepal and the stories behind them.";
  const creatorIntro =
    settings?.creatorIntro?.trim() ||
    settings?.introduction ||
    "I build things with code and tell stories with film — exploring technology, learning, Nepal, education and science, and the human side of them all.";
  const creatorCtaLabel =
    settings?.creatorCtaLabel?.trim() ||
    settings?.heroCtaSecondary ||
    "Explore My Work";
  const creatorCtaHref =
    settings?.creatorCtaHref?.trim() ||
    settings?.heroCtaSecondaryHref ||
    "/projects";
  // Always-rendered YouTube button: admin link → YouTube social link →
  // youtube.com, so the button is never a dead link or someone's channel
  // by accident.
  const creatorYoutube =
    settings?.creatorYoutube?.trim() ||
    socialLinks?.find((link) => link.platform === "YouTube")?.url ||
    "https://www.youtube.com/";
  const creatorPhoto = settings?.creatorPhoto?.trim() || "";
  const heroImage = settings?.heroImage?.trim() || "";
  const creatorInitials = creatorName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

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
      {/* ========================= CREATOR INTRO ========================= */}
      <section className="relative overflow-hidden">
        <div className="warm-glow pointer-events-none absolute inset-0" />
        <div className="grain pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />

        <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-4 pt-32 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12 lg:pt-40 lg:pb-20">
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
              Hi, I&rsquo;m{" "}
              <span className="text-gradient-warm">{creatorName}.</span>
            </motion.h1>

            <motion.p
              {...fade(0.24)}
              className="mt-5 max-w-xl text-xl leading-relaxed font-medium text-foreground sm:text-2xl"
            >
              {creatorTagline}
            </motion.p>

            <motion.p
              {...fade(0.32)}
              className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              {creatorIntro}
            </motion.p>

            <motion.div
              {...fade(0.42)}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <CtaLink href={creatorCtaHref}>
                {creatorCtaLabel}
                <ArrowRight className="size-4" />
              </CtaLink>
              {creatorYoutube && (
                <CtaLink href={creatorYoutube} variant="outline">
                  <Youtube className="size-4" />
                  YouTube
                </CtaLink>
              )}
              <Link
                to="/about"
                className="inline-flex items-center gap-2 text-sm font-semibold text-ember transition-colors hover:text-clay"
              >
                More about me
                <ArrowUpRight className="size-4" />
              </Link>
            </motion.div>

            <motion.div {...fade(0.52)} className="mt-9">
              <SocialLinks links={socialLinks ?? []} />
            </motion.div>
          </div>

          {/* Uploaded portrait */}
          <motion.div
            initial={reduced ? undefined : { opacity: 0, scale: 0.94, rotate: 2 }}
            animate={reduced ? undefined : { opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
            className="relative"
          >
            <div className="absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br from-ember/25 via-gold/10 to-clay/25 blur-3xl" />

            <div className="relative mx-auto max-w-sm rotate-[-1.5deg] lg:max-w-none">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-border bg-card shadow-[0_40px_90px_-40px_rgba(0,0,0,0.85)]">
                {creatorPhoto || heroImage ? (
                  <img
                    src={creatorPhoto || heroImage}
                    alt={creatorName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ember/25 via-gold/10 to-clay/25">
                    <span className="font-display text-gradient-warm text-7xl font-semibold select-none">
                      {creatorInitials}
                    </span>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute right-4 bottom-4 left-4 flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-background/85 px-3 py-1 text-[11px] font-bold tracking-wider text-foreground uppercase backdrop-blur">
                    {creatorName}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-ember px-3 py-1 text-[11px] font-bold tracking-wider text-white uppercase">
                    <span className="size-1.5 rounded-full bg-white" />
                    Creating
                  </span>
                </div>
              </div>
            </div>

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

            {/* Topics */}
            <div className="mt-9 flex flex-wrap justify-center gap-2 lg:justify-start">
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
          </motion.div>
        </div>
      </section>

      {/* ========================= LATEST VIDEOS ========================= */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Latest"
            title="Latest videos"
            description="Fresh from the edit — published straight from the dashboard."
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
          {latestVideoItems.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latestVideoItems.map((post, index) => (
                <Reveal key={post._id} delay={index * 0.07}>
                  <ContentCard post={post} className="h-full" />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Play}
              title="The first video is in the works"
              description="New videos appear here the moment they're published from the dashboard."
            />
          )}
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
      {showFeaturedSection && (
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
      )}

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
