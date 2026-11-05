import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Lightbulb,
  MessagesSquare,
  Newspaper,
  Radio,
  Send,
  Star,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
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
  const settings = useQuery(api.site.getSiteSettings);
  const { user, isLoading: authLoading } = useAuth();
  const editorStatus = useQuery(api.editors.myEditorStatus);
  const becomeEditor = useMutation(api.editors.becomeEditor);
  const navigate = useNavigate();
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);

  const ratePerThousand =
    typeof settings?.editorRatePerThousand === "number"
      ? settings.editorRatePerThousand
      : 1;
  const minPayout =
    typeof settings?.editorMinPayout === "number" ? settings.editorMinPayout : 10;

  // The homepage links here with #become-editor; scroll once on arrival.
  useEffect(() => {
    if (window.location.hash !== "#become-editor") return;
    const section = document.getElementById("become-editor");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const activateEditor = async () => {
    setActivating(true);
    setActivationError(null);
    try {
      const result = await becomeEditor();
      if (result.status === "disabled") {
        toast.error(
          "Your editor access is paused. Contact the site owner if this is a mistake.",
        );
        return;
      }
      toast.success(
        result.created
          ? "Editor profile activated — welcome aboard!"
          : "Your editor profile is ready.",
      );
      navigate("/editor");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not activate editor access. Please try again.";
      setActivationError(message);
      toast.error(message);
    } finally {
      setActivating(false);
    }
  };

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
        {/* Editor recruitment — activation reuses the community account. */}
        <Reveal>
          <div
            id="become-editor"
            className="grain relative mb-12 scroll-mt-24 overflow-hidden rounded-3xl border border-ember/25 bg-gradient-to-br from-ember/15 via-card to-gold/10 p-6 sm:p-8"
          >
            <div className="grid gap-7 lg:grid-cols-[1fr_17rem] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-ember/30 bg-ember/10 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-ember uppercase">
                  <Clapperboard className="size-3.5" /> Paid editor programme
                </span>
                <h2 className="font-display mt-4 text-2xl font-semibold text-foreground sm:text-3xl">
                  Become a creator hub editor
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Membership is the application. Activate your editor profile
                  with this same community account — no second form, no new
                  login — and get YouTube videos assigned to you.
                </p>
                <ul className="mt-5 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <li className="flex items-start gap-2">
                    <Wallet className="mt-0.5 size-4 shrink-0 text-ember" />
                    Rs. {ratePerThousand} per 1,000 eligible views, counted after
                    assignment
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="mt-0.5 size-4 shrink-0 text-gold" />
                    Creator Hub rating bonus of up to 1.5× on your base earnings
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-sage" />
                    Manual eSewa payouts requested through WhatsApp, from Rs.{" "}
                    {minPayout}
                  </li>
                  <li className="flex items-start gap-2">
                    <Clapperboard className="mt-0.5 size-4 shrink-0 text-ember" />
                    A private dashboard for your videos, views, ratings and
                    payments
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/50 p-4 lg:p-5">
                {authLoading || (user && editorStatus === undefined) ? (
                  <Button disabled className="w-full rounded-full">
                    Checking your account…
                  </Button>
                ) : !user ? (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      Join the community to start
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Sign in or create your free account, then activate editor
                      access here. Your existing account stays exactly as it is.
                    </p>
                    <Button
                      asChild
                      className="w-full rounded-full bg-ember text-white hover:brightness-110"
                    >
                      <Link to="/auth?returnTo=/community">
                        Join the community
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </>
                ) : editorStatus?.status === "active" ? (
                  <>
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-sage">
                      <CheckCircle2 className="size-4" /> You&apos;re an editor
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Your editor dashboard is ready with your assigned videos
                      and earnings.
                    </p>
                    <Button asChild className="w-full rounded-full">
                      <Link to="/editor">
                        Open editor dashboard
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </>
                ) : editorStatus?.status === "disabled" ? (
                  <>
                    <p className="text-sm font-semibold text-foreground">
                      Editor access paused
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Your community account still works, but editor access has
                      been paused by the site owner.
                    </p>
                    <Button asChild variant="outline" className="w-full rounded-full">
                      <Link to="/member">Go to the member area</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      Activate editor access
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Uses your community profile and account. The dashboard is
                      created automatically.
                    </p>
                    <Button
                      className="w-full rounded-full bg-ember text-white hover:brightness-110"
                      disabled={activating}
                      onClick={() => void activateEditor()}
                    >
                      {activating ? "Activating…" : "Become an editor"}
                      <Clapperboard className="size-4" />
                    </Button>
                    {activationError && (
                      <p className="text-xs leading-relaxed text-destructive">
                        {activationError}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </Reveal>

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
