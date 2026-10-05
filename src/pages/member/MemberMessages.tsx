import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal } from "@/components/site/Reveal";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

function bubbleTime(ts?: number) {
  if (!ts) return "";
  const date = new Date(ts);
  return `${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} · ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

/**
 * Private conversation between the member and the creator/admin. Convex
 * queries are reactive, so replies appear live without refreshing.
 */
export default function MemberMessages() {
  const messages = useQuery(api.members.listMyMessages);
  const profile = useQuery(api.members.getMyProfile);
  const sendMessage = useMutation(api.members.sendMessage);
  const markMessagesRead = useMutation(api.members.markMessagesRead);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const unreadFromCreator =
    messages?.filter((m) => m.sender === "admin" && m.read !== true).length ??
    0;

  // Opening the conversation marks the creator's replies as read.
  useEffect(() => {
    if (unreadFromCreator > 0) {
      markMessagesRead().catch((error) =>
        console.error("Could not mark messages read:", error),
      );
    }
  }, [unreadFromCreator, markMessagesRead]);

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages?.length]);

  const onSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await sendMessage({ body });
      setDraft("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send the message.",
      );
    } finally {
      setSending(false);
    }
  };

  const disabled = profile?.status === "disabled";

  return (
    <Reveal>
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Community messages
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A direct, private line to the creator — only the two of you can see
            this conversation.
          </p>
        </div>

        <Card className="border-border/70 bg-card/60">
          <CardContent className="p-0">
            {messages === undefined ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="max-h-[55vh] min-h-72 space-y-4 overflow-y-auto p-5">
                {messages.length === 0 ? (
                  <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
                    <span className="flex size-12 items-center justify-center rounded-full bg-ember/10">
                      <Send className="size-5 text-ember" />
                    </span>
                    <p className="mt-4 font-display text-lg font-semibold text-foreground">
                      Start the conversation
                    </p>
                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                      Ask a question, say hello or share feedback. The creator
                      reads every message and replies right here.
                    </p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const mine = message.sender === "member";
                    return (
                      <div
                        key={message._id}
                        className={cn("flex", mine ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%]",
                            mine
                              ? "bg-ember text-white"
                              : "border border-border/70 bg-background/60 text-foreground",
                          )}
                        >
                          {!mine && (
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ember">
                              {message.senderName || "Creator"}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                            {message.body}
                          </p>
                          <div
                            className={cn(
                              "mt-1.5 flex items-center gap-2 text-[10px]",
                              mine ? "text-white/75" : "text-muted-foreground",
                            )}
                          >
                            <span>{bubbleTime(message.createdAt)}</span>
                            {mine && (
                              <span
                                title={
                                  message.read === true
                                    ? "Seen by the creator"
                                    : "Not seen yet"
                                }
                                className={cn(
                                  "font-medium",
                                  message.read === true
                                    ? "text-white/95"
                                    : "text-white/60",
                                )}
                              >
                                {message.read === true ? "Seen" : "Sent"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>
            )}

            {/* Composer */}
            <div className="border-t border-border/70 p-4">
              {disabled ? (
                <p className="text-sm text-muted-foreground">
                  Your community account is disabled, so you can't send
                  messages right now.{" "}
                  <Link to="/contact" className="text-ember hover:underline">
                    Contact support
                  </Link>
                  .
                </p>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        draft.trim() &&
                        !sending
                      ) {
                        e.preventDefault();
                        void onSend();
                      }
                    }}
                    rows={2}
                    maxLength={2000}
                    placeholder="Write a message to the creator… (Enter to send, Shift+Enter for a new line)"
                    className="min-h-16 resize-none bg-background"
                  />
                  <Button
                    onClick={() => void onSend()}
                    disabled={sending || !draft.trim()}
                    className="shrink-0 rounded-full bg-ember text-white hover:brightness-110"
                  >
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Send
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Messages live in your private thread and are never visible to other
          members.
          {messages && messages.length > 0
            ? ` Last activity ${timeAgo(messages[messages.length - 1].createdAt)}.`
            : ""}
        </p>
      </div>
    </Reveal>
  );
}
