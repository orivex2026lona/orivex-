import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getMessages, sendMessage } from "@/lib/threads.functions";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandLogo";

export const Route = createFileRoute("/_authenticated/assistant/$threadId")({
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const load = useServerFn(getMessages);
  const send = useServerFn(sendMessage);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["messages", threadId],
    queryFn: () => load({ data: { threadId } }),
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [q.data, sending]);

  useEffect(() => { inputRef.current?.focus(); }, [threadId]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    // optimistic
    qc.setQueryData<Array<{ id: string; role: string; content: string; created_at: string }>>(
      ["messages", threadId],
      (old) => [...(old ?? []), { id: "temp-" + Date.now(), role: "user", content, created_at: new Date().toISOString() }],
    );
    try {
      await send({ data: { threadId, content } });
      await qc.invalidateQueries({ queryKey: ["messages", threadId] });
      await qc.invalidateQueries({ queryKey: ["threads"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Message failed");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <AppShell
      subtitle="Muse"
      title="Conversation"
      action={
        <Link to="/assistant">
          <Button size="sm" variant="ghost"><ArrowLeft className="mr-1 h-4 w-4" /> All</Button>
        </Link>
      }
    >
      <div className="space-y-4 pb-32">
        {q.data?.length === 0 && !sending && (
          <div className="rounded-2xl bg-luxe p-6 text-white text-center">
            <BrandMark className="mx-auto h-10 w-10" />
            <p className="font-display mt-3 text-xl">How may the atelier assist?</p>
            <p className="mt-2 text-sm text-white/60">
              Ask for a silhouette, a fabric, a palette, or a trend read.
            </p>
          </div>
        )}
        {q.data?.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pl-1">
            <BrandMark className="h-6 w-6" />
            <span className="italic">The atelier is composing…</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={submit}
        className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-background/95 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-2xl items-end gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
            placeholder="Ask for a design, fabric, palette…"
            className="min-h-11 max-h-40 resize-none border-border bg-card"
          />
          <Button type="submit" disabled={sending || !input.trim()} className="bg-gold-gradient text-[oklch(0.14_0.05_265)] shadow-gold" size="icon">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <BrandMark className="mt-1 h-6 w-6 shrink-0" />
      <div className="max-w-full whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {content}
      </div>
    </div>
  );
}
