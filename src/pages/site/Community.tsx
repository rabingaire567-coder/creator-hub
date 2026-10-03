import { useState } from "react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  MessagesSquare,
  Newspaper,
  Radio,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { SectionHeading } from "@/components/site/SectionHeading";
import { SocialLinks } from "@/components/site/SocialLinks";
import { usePageMeta } from "@/lib/seo";
import { SUGGESTION_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const EXPECTATIONS = [
  {
    icon: Lightbulb,
    title: "Content suggestions",
    body: "Topic ideas for videos and articles — the best ones get made and credited.",
  },
  {
    icon: MessagesSquare,
    title: "Questions & discussions",
    body: "Ask anything about the work, the process or the tools behind it.",
  },
  {
    icon: Newspaper,
    title: "Announcements",
    body: "New projects, collaborations and milestones — shared here first.",
  },
  {
    icon: Radio,
    title: "Newsletter",
    body: "An occasional digest of new work. No spam, unsubscribe any time.",
  },
];

/** Community page: suggestions, questions and newsletter signup. */
export default function Community() {
  usePageMeta(
    "Community",
    "Suggest content, ask questions and join Rabin Gaire's community.",
  );

  const createSubmission = useMutation(api.community.createSubmission);
  const socialLinks = useQuery(api.social.listSocialLinks) ?? [];

  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "Video Idea",
    suggestion: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterDone, setNewsletterDone] = useState(false);

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Please tell me your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = "That email doesn't look right.";
    if (form.suggestion.trim().length < 10)
      next.suggestion = "A little more detail helps (10+ characters).";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createSubmission({
        name: form.name.trim(),
        email: form.email.trim(),
        category: form.category,
        suggestion: form.suggestion.trim(),
      });
      setSubmitted(true);
      toast.success("Suggestion received — thank you!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onNewsletter = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newsletterEmail.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      await createSubmission({
        name: "Newsletter subscriber",
        email: newsletterEmail.trim(),
        category: "Newsletter",
        suggestion: "Newsletter subscription",
      });
      setNewsletterDone(true);
      setNewsletterEmail("");
      toast.success("You're on the list!");
    } catch {
      toast.error("Could not subscribe right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="What should I make next?"
        description="This platform grows with its community. Suggest a topic, ask a question, or subscribe for occasional updates."
      />

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          {/* Suggestion form */}
          <Reveal>
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              {submitted ? (
                <div className="py-10 text-center">
                  <CheckCircle2 className="mx-auto size-10 text-sage" />
                  <h2 className="font-display mt-5 text-2xl font-semibold text-foreground">
                    Thank you — it's in the queue!
                  </h2>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Every submission is read personally. If your idea becomes a
                    video or article, you'll be credited.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6 rounded-full"
                    onClick={() => {
                      setSubmitted(false);
                      setForm({
                        name: "",
                        email: "",
                        category: "Video Idea",
                        suggestion: "",
                      });
                    }}
                  >
                    Send another
                  </Button>
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate>
                  <h2 className="font-display text-2xl font-semibold text-foreground">
                    Share an idea
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Videos, articles, questions — all welcome.
                  </p>

                  <div className="mt-6 grid gap-5">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="cs-name">Name</Label>
                        <Input
                          id="cs-name"
                          value={form.name}
                          onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                          }
                          placeholder="Your name"
                          aria-invalid={Boolean(errors.name)}
                        />
                        {errors.name && (
                          <p className="text-xs text-destructive">{errors.name}</p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cs-email">Email</Label>
                        <Input
                          id="cs-email"
                          type="email"
                          value={form.email}
                          onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                          }
                          placeholder="you@example.com"
                          aria-invalid={Boolean(errors.email)}
                        />
                        {errors.email && (
                          <p className="text-xs text-destructive">{errors.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Type</Label>
                      <Select
                        value={form.category}
                        onValueChange={(value) =>
                          setForm({ ...form, category: value })
                        }
                      >
                        <SelectTrigger aria-label="Suggestion type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUGGESTION_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="cs-suggestion">Your suggestion</Label>
                      <Textarea
                        id="cs-suggestion"
                        rows={5}
                        value={form.suggestion}
                        onChange={(e) =>
                          setForm({ ...form, suggestion: e.target.value })
                        }
                        placeholder="What would you love to see next? Why?"
                        aria-invalid={Boolean(errors.suggestion)}
                      />
                      {errors.suggestion && (
                        <p className="text-xs text-destructive">
                          {errors.suggestion}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="justify-self-start rounded-full bg-ember px-6 text-white hover:brightness-110"
                    >
                      {submitting ? "Sending…" : "Send suggestion"}
                      <Send className="size-4" />
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </Reveal>

          {/* Right column */}
          <div className="space-y-6">
            <Reveal delay={0.1}>
              <SectionHeading
                eyebrow="How it works"
                title="A two-way street"
              />
              <div className="mt-6 space-y-4">
                {EXPECTATIONS.map((item) => (
                  <div
                    key={item.title}
                    className="flex gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-ember/30"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember">
                      <item.icon className="size-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {item.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Newsletter */}
            <Reveal delay={0.18}>
              <div className="grain relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-gold/15 via-card to-ember/10 p-6">
                <h3 className="font-display text-xl font-semibold text-foreground">
                  Join the newsletter
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  New videos, articles and projects — occasionally, never noisily.
                </p>
                {newsletterDone ? (
                  <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-sage">
                    <CheckCircle2 className="size-4" />
                    You're subscribed. Welcome aboard!
                  </p>
                ) : (
                  <form
                    onSubmit={onNewsletter}
                    className="mt-4 flex flex-col gap-2 sm:flex-row"
                  >
                    <Input
                      type="email"
                      required
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="you@example.com"
                      aria-label="Newsletter email"
                      className="rounded-full bg-background"
                    />
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="shrink-0 rounded-full bg-foreground text-background hover:bg-ember hover:text-white"
                    >
                      Subscribe
                    </Button>
                  </form>
                )}
              </div>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="rounded-3xl border border-border bg-card p-6">
                <p className="text-sm font-medium text-foreground">
                  Prefer social media?
                </p>
                <SocialLinks links={socialLinks} className="mt-3" />
                <Link
                  to="/contact"
                  className={cn(
                    "mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ember transition-colors hover:text-clay",
                  )}
                >
                  Or reach out directly
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
