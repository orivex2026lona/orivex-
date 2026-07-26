import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDesign, generateVisual, attachDesignImage, deleteDesign } from "@/lib/design.functions";
import type { AtelierAnalysis } from "@/lib/atelier.functions";
import type { Clo3dPlan } from "@/lib/clo3d.functions";
import type { EngineeringSuite } from "@/lib/engineering.functions";
import { generateCollection, saveCollection, type CollectionConcept } from "@/lib/collections.functions";
import { ArrowLeft, Box, ChevronRight, ClipboardList, Image as ImageIcon, Layers, Loader2, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/design/$id")({
  component: DesignSheet,
  errorComponent: ({ error }) => (
    <AppShell title="Design"><p className="text-sm text-destructive">{error.message}</p></AppShell>
  ),
  notFoundComponent: () => (
    <AppShell title="Design"><p className="text-sm text-muted-foreground">Design not found.</p></AppShell>
  ),
});

type DesignRow = {
  id: string;
  title: string;
  prompt: string;
  summary: string | null;
  fabrics: string[] | null;
  colors: { name: string; hex: string }[] | null;
  embroidery: string[] | null;
  style_recommendations: string[] | null;
  image_url: string | null;
  atelier_analysis: AtelierAnalysis | null;
  clo3d_plan: Clo3dPlan | null;
  engineering_suite: EngineeringSuite | null;
  created_at: string;
};


function DesignSheet() {
  const { id } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const get = useServerFn(getDesign);
  const genVisual = useServerFn(generateVisual);
  const attach = useServerFn(attachDesignImage);
  const del = useServerFn(deleteDesign);
  const genCollection = useServerFn(generateCollection);
  const saveColl = useServerFn(saveCollection);

  const q = useQuery<DesignRow>({
    queryKey: ["design", id],
    queryFn: async () => (await get({ data: { id } })) as unknown as DesignRow,
  });

  const [visualLoading, setVisualLoading] = useState(false);
  const [collLoading, setCollLoading] = useState(false);
  const [savingColl, setSavingColl] = useState(false);
  const [collection, setCollection] = useState<CollectionConcept | null>(null);

  const d = q.data;

  async function onVisual() {
    if (!d) return;
    setVisualLoading(true);
    try {
      const { image } = await genVisual({
        data: {
          title: d.title,
          summary: d.summary ?? "",
          fabrics: d.fabrics ?? [],
          colors: d.colors ?? [],
          embroidery: d.embroidery ?? [],
        },
      });
      await attach({ data: { id: d.id, image_url: image } });
      await qc.invalidateQueries({ queryKey: ["design", id] });
      await qc.invalidateQueries({ queryKey: ["designs"] });
      toast.success("Visual generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Visual generation failed");
    } finally {
      setVisualLoading(false);
    }
  }

  async function onCollection() {
    if (!d) return;
    setCollLoading(true);
    setCollection(null);
    try {
      const c = await genCollection({
        data: {
          title: d.title,
          summary: d.summary ?? "",
          fabrics: d.fabrics ?? [],
          colors: d.colors ?? [],
          embroidery: d.embroidery ?? [],
          style_recommendations: d.style_recommendations ?? [],
        },
      });
      setCollection(c);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Collection generation failed");
    } finally {
      setCollLoading(false);
    }
  }

  async function onSaveCollection() {
    if (!collection || !d) return;
    setSavingColl(true);
    try {
      const res = await saveColl({
        data: {
          source_design_id: d.id,
          name: collection.name,
          theme: collection.theme,
          story: collection.story,
          looks: collection.looks,
          cover_image_url: d.image_url ?? null,
        },
      });
      await qc.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection saved");
      router.navigate({ to: "/collections/$id", params: { id: res.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingColl(false);
    }
  }

  async function onDelete() {
    if (!d) return;
    if (!confirm("Delete this design?")) return;
    await del({ data: { id: d.id } });
    await qc.invalidateQueries({ queryKey: ["designs"] });
    toast.success("Deleted");
    router.navigate({ to: "/projects" });
  }

  return (
    <AppShell
      subtitle="Design Sheet"
      title={d?.title ?? "Loading…"}
      action={
        <Link to="/projects" className="flex items-center gap-1 text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      }
    >
      {q.isLoading && <p className="text-sm text-muted-foreground">Loading atelier…</p>}
      {d && (
        <div className="space-y-5 animate-fade-up">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-luxe shadow-luxe">
            {d.image_url ? (
              <img src={d.image_url} alt={d.title} className="aspect-[4/5] w-full object-cover" />
            ) : (
              <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 text-white/70">
                <ImageIcon className="h-8 w-8 text-[oklch(0.85_0.13_85)]" />
                <p className="text-[10px] tracking-[0.35em] uppercase">No visual yet</p>
                <Button
                  onClick={onVisual}
                  disabled={visualLoading}
                  className="bg-gold-gradient text-[oklch(0.14_0.05_265)] hover:opacity-90 shadow-gold"
                >
                  {visualLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate Visual Design
                </Button>
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 text-white">
              <p className="text-[10px] tracking-[0.4em] uppercase text-[oklch(0.85_0.13_85)]">Orivex Atelier</p>
              <h2 className="font-display text-2xl leading-tight">{d.title}</h2>
              <p className="mt-1 text-[10px] tracking-[0.25em] uppercase opacity-80">
                {new Date(d.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          {d.summary && (
            <SheetSection title="Concept">
              <p className="text-sm leading-relaxed">{d.summary}</p>
            </SheetSection>
          )}

          <SheetSection title="Color Palette">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(d.colors ?? []).map((c, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2">
                  <span
                    className="h-10 w-10 shrink-0 rounded-lg border border-black/10 shadow-inner"
                    style={{ backgroundColor: c.hex }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{c.name}</p>
                    <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">{c.hex}</p>
                  </div>
                </div>
              ))}
            </div>
          </SheetSection>

          <SheetSection title="Fabrics">
            <Bullets items={d.fabrics ?? []} />
          </SheetSection>

          <SheetSection title="Embroidery">
            <Bullets items={d.embroidery ?? []} />
          </SheetSection>

          <SheetSection title="Style Recommendations">
            <Bullets items={d.style_recommendations ?? []} />
          </SheetSection>

          <SheetSection title="Original Prompt">
            <p className="text-xs italic text-muted-foreground">“{d.prompt}”</p>
          </SheetSection>

          {d.atelier_analysis && <AtelierReport a={d.atelier_analysis} />}
          {d.clo3d_plan && <Clo3dSummary p={d.clo3d_plan} />}
          {d.engineering_suite && <EngineeringSummary e={d.engineering_suite} />}


          <Card className="border-none bg-luxe p-5 text-white shadow-luxe">
            <div className="flex items-start gap-3">
              <Layers className="mt-0.5 h-5 w-5 text-[oklch(0.85_0.13_85)]" />
              <div className="flex-1">
                <p className="text-[10px] tracking-[0.35em] uppercase text-[oklch(0.85_0.13_85)]">Expand</p>
                <h3 className="font-display mt-1 text-xl">Create a Collection</h3>
                <p className="mt-1 text-xs text-white/70">Extend this design into a complete 5-look luxury capsule.</p>
                <Button
                  onClick={onCollection}
                  disabled={collLoading}
                  className="mt-3 bg-gold-gradient text-[oklch(0.14_0.05_265)] hover:opacity-90 shadow-gold"
                >
                  {collLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Create Collection
                </Button>
              </div>
            </div>

            {collection && (
              <div className="mt-5 space-y-4 rounded-2xl bg-white/5 p-4">
                <div>
                  <p className="text-[10px] tracking-[0.35em] uppercase text-[oklch(0.85_0.13_85)]">{collection.theme}</p>
                  <h4 className="font-display mt-1 text-2xl">{collection.name}</h4>
                  <p className="mt-2 text-sm text-white/80 leading-relaxed">{collection.story}</p>
                </div>
                <div className="space-y-3">
                  {collection.looks.map((l, i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[10px] tracking-[0.3em] uppercase text-[oklch(0.85_0.13_85)]">Look {i + 1}</p>
                      <p className="font-display text-lg">{l.name}</p>
                      <p className="mt-1 text-xs text-white/70">{l.silhouette}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {l.colors.map((c, ci) => (
                          <span key={ci} className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: c.hex }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={onSaveCollection}
                  disabled={savingColl}
                  className="w-full bg-gold-gradient text-[oklch(0.14_0.05_265)] hover:opacity-90 shadow-gold"
                >
                  {savingColl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Collection
                </Button>
              </div>
            )}
          </Card>

          <Button variant="ghost" onClick={onDelete} className="w-full text-destructive hover:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Delete design
          </Button>
        </div>
      )}
    </AppShell>
  );
}

function SheetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border bg-card p-5">
      <p className="text-gold text-[10px] tracking-[0.35em] uppercase">{title}</p>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-xs text-muted-foreground italic">—</p>;
  return (
    <ul className="space-y-2">
      {items.map((i, idx) => (
        <li key={idx} className="flex gap-2 text-sm">
          <ChevronRight className="mt-1 h-3 w-3 shrink-0 text-[color:var(--color-gold)]" />
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}

function AtelierReport({ a }: { a: AtelierAnalysis }) {
  const scoreBar = (n: number) => (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full bg-gold-gradient" style={{ width: `${Math.max(0, Math.min(10, n)) * 10}%` }} />
    </div>
  );

  const Metric = ({ label, value, score, note }: { label: string; value: string; score: number; note?: string }) => (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] tracking-[0.35em] uppercase text-[oklch(0.85_0.13_85)]">{label}</p>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <p className="font-display text-lg leading-tight text-white">{value}</p>
        <p className="text-sm text-white/80">{score}/10</p>
      </div>
      {scoreBar(score)}
      {note && <p className="mt-2 text-xs text-white/70 leading-relaxed">{note}</p>}
    </div>
  );

  return (
    <Card className="border-none bg-luxe p-5 text-white shadow-luxe">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 text-[oklch(0.85_0.13_85)]" />
        <div className="flex-1">
          <p className="text-[10px] tracking-[0.35em] uppercase text-[oklch(0.85_0.13_85)]">Atelier AI Report</p>
          <h3 className="font-display mt-1 text-xl">Couture Analysis</h3>
          {a.design_type && (
            <p className="mt-1 text-xs tracking-[0.15em] uppercase text-white/70">{a.design_type}</p>
          )}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {a.silhouette && (
          <ReportBlock title="Silhouette Analysis"><p className="text-sm leading-relaxed text-white/85">{a.silhouette}</p></ReportBlock>
        )}
        {a.design_structure && (
          <ReportBlock title="Design Structure"><p className="text-sm leading-relaxed text-white/85">{a.design_structure}</p></ReportBlock>
        )}
        {a.construction?.length > 0 && (
          <ReportBlock title="Construction Details"><DarkBullets items={a.construction} /></ReportBlock>
        )}
        {a.fabric_suggestions?.length > 0 && (
          <ReportBlock title="Recommended Fabrics">
            <ul className="space-y-2">
              {a.fabric_suggestions.map((f, i) => (
                <li key={i} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="font-display text-sm text-white">{f.fabric}</p>
                  <p className="mt-1 text-xs text-white/70 leading-relaxed">{f.reason}</p>
                </li>
              ))}
            </ul>
          </ReportBlock>
        )}
        {(a.color_palette?.length > 0 || a.color_harmony) && (
          <ReportBlock title="Color Harmony">
            {a.color_palette?.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {a.color_palette.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-2">
                    <span className="h-9 w-9 shrink-0 rounded-lg border border-white/20 shadow-inner" style={{ backgroundColor: c.hex }} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-white">{c.name}</p>
                      <p className="text-[10px] tracking-[0.15em] uppercase text-white/60">{c.hex}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {a.color_harmony && <p className="mt-3 text-sm leading-relaxed text-white/85">{a.color_harmony}</p>}
          </ReportBlock>
        )}
        {a.embroidery?.length > 0 && (
          <ReportBlock title="Embroidery Analysis"><DarkBullets items={a.embroidery} /></ReportBlock>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {a.luxury_level && <Metric label="Luxury Level" value={a.luxury_level.tier} score={a.luxury_level.score} note={a.luxury_level.rationale} />}
          {a.runway_readiness && <Metric label="Runway Readiness" value={`${a.runway_readiness.score}/10`} score={a.runway_readiness.score} note={a.runway_readiness.rationale} />}
          {a.production_difficulty && <Metric label="Production Difficulty" value={a.production_difficulty.level} score={a.production_difficulty.score} note={a.production_difficulty.rationale} />}
        </div>

        {a.design_improvements?.length > 0 && (
          <ReportBlock title="Suggested Improvements"><DarkBullets items={a.design_improvements} /></ReportBlock>
        )}
        {a.clo3d_notes?.length > 0 && (
          <ReportBlock title="CLO3D Preparation Notes"><DarkBullets items={a.clo3d_notes} /></ReportBlock>
        )}
        {a.technical_notes?.length > 0 && (
          <ReportBlock title="Technical Notes"><DarkBullets items={a.technical_notes} /></ReportBlock>
        )}
        {a.style_recommendations?.length > 0 && (
          <ReportBlock title="Style Recommendations"><DarkBullets items={a.style_recommendations} /></ReportBlock>
        )}
      </div>
    </Card>
  );
}

function ReportBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <p className="text-[10px] tracking-[0.35em] uppercase text-[oklch(0.85_0.13_85)]">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function DarkBullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((i, idx) => (
        <li key={idx} className="flex gap-2 text-sm text-white/85">
          <ChevronRight className="mt-1 h-3 w-3 shrink-0 text-[oklch(0.85_0.13_85)]" />
          <span>{i}</span>
        </li>
      ))}
    </ul>
  );
}

function Clo3dSummary({ p }: { p: Clo3dPlan }) {
  return (
    <Card className="border-none bg-luxe p-5 text-white shadow-luxe">
      <div className="flex items-start gap-3">
        <Box className="mt-0.5 h-5 w-5 text-[oklch(0.85_0.13_85)]" />
        <div>
          <p className="text-[10px] tracking-[0.35em] uppercase text-[oklch(0.85_0.13_85)]">CLO3D Production Plan</p>
          <h3 className="font-display mt-1 text-xl">{p.difficulty?.level ?? "Couture Plan"}</h3>
          <p className="mt-1 text-xs text-white/70">
            {p.pattern_planning?.estimated_pieces ?? "—"} pieces · {p.production_time?.total_hours ?? "—"}h total
          </p>
        </div>
      </div>
      {p.workflow?.length > 0 && (
        <ol className="mt-4 space-y-2">
          {p.workflow.map((w, i) => (
            <li key={i} className="rounded-xl bg-white/5 p-3">
              <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.85_0.13_85)]">Step {i + 1} · {w.step}</p>
              <p className="mt-1 text-xs text-white/80 leading-relaxed">{w.detail}</p>
            </li>
          ))}
        </ol>
      )}
      {p.shopping_list && (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Object.entries(p.shopping_list).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2">
              <span className="text-[10px] tracking-[0.25em] uppercase text-white/60">{k.replace(/_/g, " ")}</span>
              <span className="text-sm text-white">{v}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function EngineeringSummary({ e }: { e: EngineeringSuite }) {
  return (
    <Card className="border-none bg-luxe p-5 text-white shadow-luxe">
      <div className="flex items-start gap-3">
        <ClipboardList className="mt-0.5 h-5 w-5 text-[oklch(0.85_0.13_85)]" />
        <div>
          <p className="text-[10px] tracking-[0.35em] uppercase text-[oklch(0.85_0.13_85)]">Engineering Suite</p>
          <h3 className="font-display mt-1 text-xl">{e.technical_sheet?.category ?? "Technical Sheet"}</h3>
          <p className="mt-1 text-xs text-white/70">
            {e.pattern_draft?.length ?? 0} pattern pieces · {e.sewing_blueprint?.length ?? 0} sewing steps · {e.risk_detector?.length ?? 0} risks
          </p>
        </div>
      </div>
      {e.risk_detector?.length > 0 && (
        <ul className="mt-4 space-y-2">
          {e.risk_detector.slice(0, 4).map((r, i) => (
            <li key={i} className="rounded-xl bg-white/5 p-3">
              <div className="flex items-center justify-between">
                <p className="font-display text-sm text-white">{r.area}</p>
                <span className="text-[10px] tracking-[0.2em] uppercase text-[oklch(0.85_0.13_85)]">{r.risk_level}</span>
              </div>
              <p className="mt-1 text-xs text-white/70">{r.fix}</p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[10px] tracking-[0.25em] uppercase text-white/60">
        Open Atelier to view the full pattern draft, sewing blueprint, and tech pack.
      </p>
    </Card>
  );
}
