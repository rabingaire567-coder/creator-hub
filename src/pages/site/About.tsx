import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Quote } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";
import { SocialLinks } from "@/components/site/SocialLinks";
import { StatCounter } from "@/components/site/StatCounter";
import { usePageMeta } from "@/lib/seo";
import { DEFAULT_STATS, parseJsonArray, type Stat } from "@/lib/format";

interface Section {
  title: string;
  body: string;
}
interface TimelineItem {
  label: string;
  note: string;
}

const DEFAULT_SECTIONS: Section[] = [
  {
    title: "Who I Am",
    body: "I'm Rabin Gaire — a creator and developer who loves understanding how things work, then explaining them clearly.",
  },
  {
    title: "What I Create",
    body: "Documentaries and explainers about technology, education, science and life in Nepal — plus web projects that make learning easier.",
  },
  {
    title: "What I Am Learning",
    body: "Storytelling craft, editing, and the engineering behind the products I use every day. Learning in public is part of the point.",
  },
  {
    title: "Why I Create",
    body: "Because good explanations change what people believe is possible — especially for students and young creators in Nepal.",
  },
  {
    title: "My Vision",
    body: "A body of work that compounds: films, articles and tools that help people stay curious for years to come.",
  },
];

const DEFAULT_TIMELINE: TimelineItem[] = [
  { label: "Student", note: "Curious about science, technology and the wider world." },
  { label: "Creator", note: "Started filming and publishing stories online." },
  { label: "Developer", note: "Building web projects and learning in public." },
  { label: "Builder", note: "Shipping products that solve real problems." },
  { label: "Future", note: "A trusted platform for ideas from Nepal to the world." },
];

/** Storytelling-based About page — every word editable from the dashboard. */
export default function About() {
  usePageMeta(
    "About",
    "Who Rabin Gaire is, what he creates, learns and why he creates it.",
  );

  const settings = useQuery(api.site.getSiteSettings);
  const socialLinks = useQuery(api.social.listSocialLinks);
  const reduced = useReducedMotion();

  const sections =
    parseJsonArray<Section>(settings?.aboutSections, DEFAULT_SECTIONS) ??
    DEFAULT_SECTIONS;
  const timeline =
    parseJsonArray<TimelineItem>(settings?.timeline, DEFAULT_TIMELINE) ??
    DEFAULT_TIMELINE;
  const stats = parseJsonArray<Stat>(settings?.stats, DEFAULT_STATS);

  return (
    <>
      <PageHeader
        eyebrow="About"
        title={
          <>
            Curiosity, craft
            <br className="hidden sm:block" /> and consistency.
          </>
        }
        description={
          settings?.introduction ||
          "Hi, I'm Rabin Gaire. I build things with code and tell stories with film."
        }
      />

      {/* Story sections */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <div className="space-y-10">
          {sections.map((section, index) => (
            <Reveal key={`${section.title}-${index}`} delay={index * 0.05}>
              <div className="grid gap-4 border-b border-border pb-10 last:border-b-0 sm:grid-cols-[220px_1fr] sm:gap-10">
                <div>
                  <p className="font-display text-xl font-semibold text-foreground">
                    {section.title}
                  </p>
                  <span className="mt-2 block h-1 w-10 rounded-full bg-gradient-to-r from-ember to-gold" />
                </div>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  {section.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
          <Reveal>
            <SectionHeading
              eyebrow="The path"
              title="Student → Future"
              description="A work in progress — each step learned in public."
              align="center"
            />
          </Reveal>

          <ol className="mt-12 relative">
            <span className="absolute top-0 bottom-0 left-[15px] w-px bg-gradient-to-b from-ember via-gold to-sage sm:left-1/2" />
            {timeline.map((item, index) => {
              const isRight = index % 2 === 1;
              return (
                <Reveal key={`${item.label}-${index}`} delay={index * 0.08}>
                  <li className="relative mb-10 pl-12 sm:grid sm:grid-cols-2 sm:gap-12 sm:pl-0 sm:last:mb-0">
                    <span
                      className={`absolute top-1.5 left-0 flex size-[31px] items-center justify-center rounded-full border border-border bg-background text-xs font-bold text-ember sm:left-1/2 sm:-translate-x-1/2 ${isRight ? "" : ""}`}
                    >
                      {index + 1}
                    </span>
                    <div
                      className={`${isRight ? "sm:col-start-2 sm:pl-10" : "sm:col-start-1 sm:pr-10 sm:text-right"}`}
                    >
                      <p className="font-display text-xl font-semibold text-foreground">
                        {item.label}
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {item.note}
                      </p>
                    </div>
                  </li>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Quote + stats */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <Reveal>
          <blockquote className="relative rounded-3xl border border-border bg-card p-8 sm:p-12">
            <Quote className="size-8 text-ember/50" />
            <p className="font-display mt-4 text-2xl leading-relaxed font-medium text-foreground text-balance sm:text-3xl">
              “Make the complicated simple, and the simple beautiful — that's the
              whole job.”
            </p>
          </blockquote>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 0.07} className="text-center">
              <p className="font-display text-4xl font-semibold text-foreground">
                <StatCounter value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-1.5 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                {stat.label}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-4 sm:px-6">
        <Reveal>
          <div className="grain relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-ember/15 via-card to-gold/10 px-7 py-12 text-center sm:px-12">
            <motion.h2
              initial={reduced ? undefined : { opacity: 0, y: 14 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="font-display mx-auto max-w-2xl text-3xl leading-tight font-semibold text-foreground sm:text-4xl"
            >
              Let's build something together.
            </motion.h2>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-ember px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_-16px_var(--ember)] transition-all hover:-translate-y-0.5 hover:brightness-110"
              >
                Get in touch
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/content"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-ember/50 hover:text-ember"
              >
                See my work
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
            <SocialLinks links={socialLinks ?? []} className="mt-8 justify-center" />
          </div>
        </Reveal>
      </section>
    </>
  );
}
