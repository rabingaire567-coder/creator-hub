import { useState } from "react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Reveal } from "@/components/site/Reveal";
import { SUGGESTION_CATEGORIES } from "@/lib/constants";

/** Suggest a topic — prefilled from the member's community profile. */
export default function MemberSuggest() {
  const profile = useQuery(api.members.getMyProfile);
  const createSubmission = useMutation(api.community.createSubmission);

  const [category, setCategory] = useState<string>("Video Idea");
  const [suggestion, setSuggestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const name = profile?.displayName ?? "";
  const email = profile?.email ?? "";

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (suggestion.trim().length < 10) {
      toast.error("A little more detail helps (10+ characters).");
      return;
    }
    if (!email) {
      toast.error("Your profile needs an email address — sign in again.");
      return;
    }
    setSubmitting(true);
    try {
      await createSubmission({
        name: name || "Community member",
        email,
        category,
        suggestion: suggestion.trim(),
      });
      setSubmitted(true);
      toast.success("Suggestion received — thank you!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Reveal>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Suggest a topic
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Videos, articles, questions — all welcome. The best ideas get made
            and credited.
          </p>
        </div>

        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-6">
            {submitted ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto size-10 text-sage" />
                <h2 className="font-display mt-4 text-xl font-semibold text-foreground">
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
                    setSuggestion("");
                  }}
                >
                  Send another
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="grid gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="ms-name">Your name</Label>
                    <Input id="ms-name" value={name} readOnly className="opacity-80" />
                    <p className="text-xs text-muted-foreground">
                      From your profile ·{" "}
                      <Link
                        to="/member/profile"
                        className="text-ember hover:underline"
                      >
                        edit in profile
                      </Link>
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ms-type">Type</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger aria-label="Suggestion type" id="ms-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUGGESTION_CATEGORIES.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="ms-suggestion">Your suggestion</Label>
                  <Textarea
                    id="ms-suggestion"
                    rows={6}
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                    placeholder="What would you love to see next? Why?"
                    maxLength={2000}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="justify-self-start rounded-full bg-ember px-6 text-white hover:brightness-110"
                >
                  {submitting ? "Sending…" : "Send suggestion"}
                  <Send className="size-4" />
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Reveal>
  );
}
