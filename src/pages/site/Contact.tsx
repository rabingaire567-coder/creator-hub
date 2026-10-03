import { useState } from "react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
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
import { SocialLinks } from "@/components/site/SocialLinks";
import { usePageMeta } from "@/lib/seo";
import { CONTACT_CATEGORIES } from "@/lib/constants";

/** Contact page — categorized messages stored in the database for the admin. */
export default function Contact() {
  usePageMeta(
    "Contact",
    "Work with Rabin Gaire — brand collaborations, content, web development and more.",
  );

  const createMessage = useMutation(api.contact.createContactMessage);
  const socialLinks = useQuery(api.social.listSocialLinks) ?? [];
  const settings = useQuery(api.site.getSiteSettings);

  const [form, setForm] = useState<{
    name: string;
    email: string;
    category: string;
    subject: string;
    message: string;
  }>({
    name: "",
    email: "",
    category: CONTACT_CATEGORIES[0],
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Please share your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = "That email doesn't look right.";
    if (form.subject.trim().length < 3) next.subject = "Add a short subject.";
    if (form.message.trim().length < 15)
      next.message = "Tell me a bit more (15+ characters).";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      setSent(true);
      toast.success("Message sent — I'll get back to you soon.");
    } catch {
      toast.error("Could not send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Let's work together"
        description="Collaborations, commissions, questions — pick a category and send a message. Everything lands straight in the dashboard."
      />

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          <Reveal>
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              {sent ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="mx-auto size-10 text-sage" />
                  <h2 className="font-display mt-5 text-2xl font-semibold text-foreground">
                    Message received
                  </h2>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Thanks for reaching out. Expect a reply within a couple of
                    days at the email you provided.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6 rounded-full"
                    onClick={() => {
                      setSent(false);
                      setForm({
                        name: "",
                        email: "",
                        category: CONTACT_CATEGORIES[0],
                        subject: "",
                        message: "",
                      });
                    }}
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate>
                  <div className="grid gap-5">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="ct-name">Name</Label>
                        <Input
                          id="ct-name"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="Your name"
                          aria-invalid={Boolean(errors.name)}
                        />
                        {errors.name && (
                          <p className="text-xs text-destructive">{errors.name}</p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="ct-email">Email</Label>
                        <Input
                          id="ct-email"
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
                      <Label>What is this about?</Label>
                      <Select
                        value={form.category}
                        onValueChange={(value) =>
                          setForm({ ...form, category: value })
                        }
                      >
                        <SelectTrigger aria-label="Contact category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTACT_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="ct-subject">Subject</Label>
                      <Input
                        id="ct-subject"
                        value={form.subject}
                        onChange={(e) =>
                          setForm({ ...form, subject: e.target.value })
                        }
                        placeholder="Quick summary"
                        aria-invalid={Boolean(errors.subject)}
                      />
                      {errors.subject && (
                        <p className="text-xs text-destructive">{errors.subject}</p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="ct-message">Message</Label>
                      <Textarea
                        id="ct-message"
                        rows={6}
                        value={form.message}
                        onChange={(e) =>
                          setForm({ ...form, message: e.target.value })
                        }
                        placeholder="Details, timeline, budget (if relevant)…"
                        aria-invalid={Boolean(errors.message)}
                      />
                      {errors.message && (
                        <p className="text-xs text-destructive">{errors.message}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="justify-self-start rounded-full bg-ember px-6 text-white hover:brightness-110"
                    >
                      {submitting ? "Sending…" : "Send message"}
                      <Send className="size-4" />
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </Reveal>

          <div className="space-y-6">
            <Reveal delay={0.1}>
              <div className="space-y-4">
                {[
                  {
                    icon: Mail,
                    title: "Email",
                    body: settings?.siteUrl
                      ? "Prefer email? Use the address in my social profiles."
                      : "Replies come straight to your inbox.",
                  },
                  {
                    icon: Clock3,
                    title: "Response time",
                    body: "Usually within 48 hours, Monday to Friday (NPT).",
                  },
                  {
                    icon: MapPin,
                    title: "Based in",
                    body: "Nepal — working with people worldwide.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex gap-4 rounded-2xl border border-border bg-card p-4"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember">
                      <item.icon className="size-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="grain relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-ember/15 via-card to-gold/10 p-6">
                <h3 className="font-display text-xl font-semibold text-foreground">
                  Or find me elsewhere
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  DMs are open on most platforms.
                </p>
                <SocialLinks links={socialLinks} className="mt-4" showLabels />
                <Link
                  to="/community"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ember transition-colors hover:text-clay"
                >
                  Suggest content instead
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
