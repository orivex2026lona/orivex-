import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { generateDesign, saveDesign, generateVisual, type DesignConcept } from "@/lib/design.functions";
import { Loader2, Sparkles, Save, Wand2, Image as ImageIcon } from "lucide-react";

import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/new-design")({
  component: NewDesign,
});

const EXAMPLES = [
  "A royal blue princess gown with crystal embroidery",
  "Modern minimalist ivory tuxedo suit with satin lapels",
  "Bohemian summer maxi dress with hand-painted florals",
];

function NewDesign() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [concept, setConcept] = useState<DesignConcept | null>(null);
  const [saving, setSaving] = useState(false);
  const [visual, setVisual] = useState<string | null>(null);
  const [visualLoading, setVisualLoading] = useState(false);
  const generate = useServerFn(generateDesign);
  const save = useServerFn(saveDesign);
  const genVisual = useServerFn(generateVisual);
  const navigate = useNavigate();

  async function onGenerate() {
    if (prompt.trim().length < 4) return;
    setLoading(true);
    setConcept(null);
    setVisual(null);
    try {
      const c = await generate({ data: { prompt } });
      setConcept(c);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  async function onGenerateVisual() {
    if (!concept) return;
    setVisualLoading(true);
    try {
      const { image } = await genVisual({
        data: {
          title: concept.title,
          summary: concept.summary,
          fabrics: concept.fabrics,
          colors: concept.colors,
          embroidery: concept.embroidery,
        },
      });
      setVisual(image);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Visual generation failed");
    } finally {
      setVisualLoading(false);
    }
  }

  async function onSave() {
    if (!concept) return;
    setSaving(true);
    try {
      const res = await save({
        data: {
          title: concept.title,
          prompt,
          summary: concept.summary,
          fabrics: concept.fabrics,
          colors: concept.colors,
          embroidery: concept.embroidery,
          style_recommendations: concept.style_recommendations,
          image_url: visual,
        },
      });
      toast.success("Saved to your atelier");
      navigate({ to: "/projects", search: { highlight: res.id } as never });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }


  return (
    <AppShell subtitle="Create" title="New Design">
      <Card className="border-border bg-card p-4">
        <label className="text-gold text-[10px] tracking-[0.35em] uppercase">Describe your idea</label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Create a royal blue princess gown with crystal embroidery"
          className="mt-2 min-h-28 resize-none border-border bg-background"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              onClick={() => setPrompt(e)}
              className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground hover:border-[color:var(--color-gold)] hover:text-foreground transition"
            >
              {e}
            </button>
          ))}
        </div>
        <Button
          onClick={onGenerate}
          disabled={loading || prompt.trim().length < 4}
          className="mt-4 w-full bg-gold-gradient text-[oklch(0.14_0.05_265)] hover:opacity-90 shadow-gold"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          Generate concept
        </Button>
      </Card>

      {loading && (
        <div className="mt-6 rounded-2xl bg-luxe p-8 text-center text-white">
          <Sparkles className="mx-auto h-6 w-6 text-[oklch(0.85_0.13_85)] animate-pulse" />
          <p className="font-display mt-3 text-xl">The atelier is imagining…</p>
          <p className="mt-1 text-sm text-white/60">Weaving fabric, palette, and detail.</p>
        </div>
      )}

      {concept && (
        <div className="mt-6 space-y-4 animate-fade-up">
          <Card className="border-none bg-luxe p-6 text-white shadow-luxe">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[oklch(0.85_0.13_85)]">Concept</p>
            <h2 className="font-display mt-2 text-3xl leading-tight">{concept.title}</h2>
            <p className="mt-3 text-sm text-white/80 leading-relaxed">{concept.summary}</p>
          </Card>

          <Section title="Color Palette">
            <div className="flex flex-wrap gap-3">
              {concept.colors.map((c) => (
                <div key={c.hex + c.name} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
                  <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
                  <span className="text-xs">{c.name}</span>
                  <span className="text-[10px] uppercase text-muted-foreground">{c.hex}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Fabric Suggestions">
            <List items={concept.fabrics} />
          </Section>

          <Section title="Embroidery Ideas">
            <List items={concept.embroidery} />
          </Section>

          <Section title="Style Recommendations">
            <List items={concept.style_recommendations} />
          </Section>

          <Card className="border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-gold text-[10px] tracking-[0.35em] uppercase">Visual Design</p>
              {visual && !visualLoading && (
                <button
                  onClick={onGenerateVisual}
                  className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground hover:text-foreground transition"
                >
                  Regenerate
                </button>
              )}
            </div>

            {!visual && !visualLoading && (
              <Button
                onClick={onGenerateVisual}
                className="mt-3 w-full bg-gold-gradient text-[oklch(0.14_0.05_265)] hover:opacity-90 shadow-gold"
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Generate Visual Design
              </Button>
            )}

            {visualLoading && (
              <div className="mt-3 aspect-square w-full overflow-hidden rounded-xl bg-luxe flex flex-col items-center justify-center text-white">
                <Sparkles className="h-6 w-6 text-[oklch(0.85_0.13_85)] animate-pulse" />
                <p className="font-display mt-3 text-lg">Rendering couture visual…</p>
                <p className="mt-1 text-xs text-white/60">This can take up to a minute.</p>
              </div>
            )}

            {visual && !visualLoading && (
              <div className="mt-3 overflow-hidden rounded-xl border border-border shadow-luxe">
                <img src={visual} alt={concept.title} className="aspect-square w-full object-cover" />
              </div>
            )}
          </Card>

          <Button onClick={onSave} disabled={saving} className="w-full bg-primary text-primary-foreground">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save to My Projects
          </Button>

        </div>
      )}
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border bg-card p-5">
      <p className="text-gold text-[10px] tracking-[0.35em] uppercase">{title}</p>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((i, idx) => (
        <li key={idx} className="flex gap-3 text-sm">
          <span className="text-gold mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[color:var(--color-gold)]" />
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}
