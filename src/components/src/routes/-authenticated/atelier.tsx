import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Upload,
  Sparkles,
  Loader2,
  FileText,
  ChevronRight,
  Box,
  Layers,
  Compass,

  Save,
  X,
  Gem,
  Wand2,
  Award,
  Hammer,
} from "lucide-react";
import { toast } from "sonner";
import {
  analyzeSketch,
  saveAnalysisToProject,
  listUserProjects,
  type AtelierAnalysis,
} from "@/lib/atelier.functions";
import { generateClo3dPlan, type Clo3dPlan } from "@/lib/clo3d.functions";
import { generateEngineeringSuite, type EngineeringSuite } from "@/lib/engineering.functions";
import { saveClo3dPlan, saveEngineeringSuite } from "@/lib/design.functions";

import { Download, FileDown, ScrollText, Scissors, Ruler, Clock, ShoppingBag, Gauge, ShieldAlert, ClipboardList, Sliders, Shirt } from "lucide-react";

export const Route = createFileRoute("/_authenticated/atelier")({
  component: AtelierPage,
});

const MAX_SIZE = 6 * 1024 * 1024;
const NOTES_KEY = "orivex.atelier.notes";

function AtelierPage() {
  const analyze = useServerFn(analyzeSketch);
  const saveAnalysis = useServerFn(saveAnalysisToProject);
  const listProjects = useServerFn(listUserProjects);
  const genClo3d = useServerFn(generateClo3dPlan);
  const genEngineering = useServerFn(generateEngineeringSuite);
  const persistClo3d = useServerFn(saveClo3dPlan);
  const persistEng = useServerFn(saveEngineeringSuite);

  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AtelierAnalysis | null>(null);
  const [notes, setNotes] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [clo3d, setClo3d] = useState<Clo3dPlan | null>(null);
  const [clo3dLoading, setClo3dLoading] = useState(false);
  const [engineering, setEngineering] = useState<EngineeringSuite | null>(null);
  const [engLoading, setEngLoading] = useState(false);

  const [savingClo3d, setSavingClo3d] = useState(false);
  const [savingEng, setSavingEng] = useState(false);

  async function onSaveClo3dToProject() {
    if (!clo3d) return;
    if (!selectedProject) { toast.error("Select a project first (below Save Analysis)."); return; }
    setSavingClo3d(true);
    try {
      await persistClo3d({ data: { project_id: selectedProject, plan: clo3d as unknown as Record<string, unknown> } });
      toast.success("CLO3D plan saved with project");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save plan");
    } finally { setSavingClo3d(false); }
  }

  async function onSaveEngToProject() {
    if (!engineering) return;
    if (!selectedProject) { toast.error("Select a project first (below Save Analysis)."); return; }
    setSavingEng(true);
    try {
      await persistEng({ data: { project_id: selectedProject, plan: engineering as unknown as Record<string, unknown> } });
      toast.success("Engineering suite saved with project");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save suite");
    } finally { setSavingEng(false); }
  }

  async function onGenerateEngineering() {

    if (!analysis) { toast.error("Analyze a design first."); return; }
    setEngLoading(true);
    try {
      const suite = await genEngineering({
        data: {
          analysis: analysis as unknown as Record<string, unknown>,
          clo3d: (clo3d as unknown as Record<string, unknown>) ?? undefined,
        },
      });
      setEngineering(suite);
      toast.success("Engineering suite ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Engineering generation failed");
    } finally {
      setEngLoading(false);
    }
  }

  async function onGenerateClo3d() {
    if (!analysis) { toast.error("Analyze a design first."); return; }
    setClo3dLoading(true);
    try {
      const plan = await genClo3d({ data: { analysis: analysis as unknown as Record<string, unknown> } });
      setClo3d(plan);
      toast.success("CLO3D plan ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "CLO3D generation failed");
    } finally {
      setClo3dLoading(false);
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { notes: string; savedAt: string };
        setNotes(parsed.notes ?? "");
        setSavedAt(parsed.savedAt ?? null);
      }
    } catch { /* ignore */ }
    listProjects()
      .then((rows) => setProjects(rows.map((r) => ({ id: r.id, title: r.title }))))
      .catch(() => { /* ignore */ });
  }, [listProjects]);

  function pickFile(f: File | null) {
    if (!f) return;
    if (f.size > MAX_SIZE) { toast.error("File too large. Maximum 6MB."); return; }
    const ok = ["image/jpeg", "image/png", "image/jpg", "application/pdf"].includes(f.type);
    if (!ok) { toast.error("Only JPG, PNG, or PDF are supported."); return; }
    setFile(f);
    setAnalysis(null);
    if (f.type.startsWith("image/")) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    setAnalysis(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function onAnalyze() {
    if (!file) { toast.error("Upload a sketch or inspiration image first."); return; }
    setLoading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error("Could not read file"));
        r.readAsDataURL(file);
      });
      const res = await analyze({
        data: { file_data_url: dataUrl, filename: file.name, mime: file.type, hint: hint || undefined },
      });
      setAnalysis(res);
      toast.success("Atelier analysis complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  function onSaveNotes() {
    const stamp = new Date().toISOString();
    localStorage.setItem(NOTES_KEY, JSON.stringify({ notes, savedAt: stamp }));
    setSavedAt(stamp);
    toast.success("Designer notes saved");
  }

  async function onSaveToProject() {
    if (!analysis) return;
    if (!selectedProject) { toast.error("Select a project to save this analysis to."); return; }
    setSaving(true);
    try {
      await saveAnalysis({
        data: { project_id: selectedProject, analysis: analysis as unknown as Record<string, unknown> },
      });
      toast.success("Analysis saved with your project");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save analysis");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      subtitle="Atelier"
      title="AI Fashion Designer"
      action={
        <Link to="/dashboard" className="flex items-center gap-1 text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
      }
    >
      <Card className="border-none bg-luxe p-6 text-white shadow-luxe">
        <p className="text-[10px] tracking-[0.4em] uppercase text-[oklch(0.85_0.13_85)]">Orivex · Atelier</p>
        <h2 className="font-display mt-2 text-3xl leading-tight">Sketch to Couture Intelligence</h2>
        <p className="mt-3 text-sm text-white/80 leading-relaxed">
          Upload sketches, mood boards, or reference photos. ORIVEX interprets silhouette, structure, fabric,
          palette, embroidery, and runway readiness with couture precision.
        </p>
      </Card>

      <Card className="mt-5 border-border bg-card p-5">
        <p className="text-gold text-[10px] tracking-[0.35em] uppercase">Step 01 · Upload</p>
        <h3 className="font-display mt-1 text-xl">Sketch & Inspiration</h3>

        <div className="mt-4">
          <label
            htmlFor="atelier-file"
            className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center transition hover:border-[color:var(--color-gold)] hover:bg-muted/50"
          >
            <div className="rounded-full border border-border bg-background p-3">
              <Upload className="h-5 w-5 text-[color:var(--color-gold)]" />
            </div>
            <p className="text-sm font-medium">Tap to upload a sketch or inspiration</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">JPG · PNG · PDF · max 6MB</p>
            <Input
              id="atelier-file"
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg,application/pdf"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {file && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
              {preview ? (
                <img src={preview} alt={file.name} className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-background">
                  <FileText className="h-5 w-5 text-[color:var(--color-gold)]" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB · {file.type || "unknown"}
                </p>
              </div>
              <button onClick={clearFile} className="rounded-md p-1 text-muted-foreground hover:text-foreground" aria-label="Remove file">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <Textarea
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Optional: add a directive for the atelier (mood, occasion, target house voice)…"
            className="mt-3 min-h-[80px]"
          />

          <Button
            onClick={onAnalyze}
            disabled={loading || !file}
            className="mt-3 w-full bg-gold-gradient text-[oklch(0.14_0.05_265)] hover:opacity-90 shadow-gold"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {loading ? "Analyzing atelier reference…" : "Analyze Design"}
          </Button>
        </div>
      </Card>

      {analysis && (
        <div className="mt-5 space-y-4 animate-fade-up">
          {/* Header */}
          <Card className="border-none bg-luxe p-6 text-white shadow-luxe">
            <p className="text-[10px] tracking-[0.4em] uppercase text-[oklch(0.85_0.13_85)]">Couture Report</p>
            <h3 className="font-display mt-2 text-3xl leading-tight">{analysis.design_type}</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/80">{analysis.silhouette}</p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ScoreTile icon={Gem} label="Luxury Level" value={analysis.luxury_level.tier} score={analysis.luxury_level.score} />
              <ScoreTile icon={Award} label="Runway Readiness" value={`${analysis.runway_readiness.score}/10`} score={analysis.runway_readiness.score} />
              <ScoreTile icon={Hammer} label="Production Difficulty" value={analysis.production_difficulty.level} score={analysis.production_difficulty.score} />
            </div>
          </Card>

          <SectionCard title="Silhouette Analysis"><Prose>{analysis.silhouette}</Prose></SectionCard>
          <SectionCard title="Design Structure"><Prose>{analysis.design_structure}</Prose></SectionCard>
          <SectionCard title="Construction Details"><Bullets items={analysis.construction} /></SectionCard>

          <SectionCard title="Recommended Fabrics">
            <ul className="space-y-3">
              {analysis.fabric_suggestions.map((f, i) => (
                <li key={i} className="rounded-xl border border-border bg-muted/20 p-3">
                  <p className="text-sm font-medium text-[color:var(--color-gold)]">{f.fabric}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.reason}</p>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Color Palette">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {analysis.color_palette.map((c, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-2">
                  <span className="h-10 w-10 shrink-0 rounded-lg border border-black/10 shadow-inner" style={{ backgroundColor: c.hex }} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{c.name}</p>
                    <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">{c.hex}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Color Harmony"><Prose>{analysis.color_harmony}</Prose></SectionCard>
          <SectionCard title="Embroidery & Surface Detail"><Bullets items={analysis.embroidery} /></SectionCard>

          <SectionCard title="Luxury Level Evaluation">
            <RatingBlock tier={analysis.luxury_level.tier} score={analysis.luxury_level.score} rationale={analysis.luxury_level.rationale} />
          </SectionCard>
          <SectionCard title="Runway Readiness">
            <RatingBlock tier={`${analysis.runway_readiness.score} / 10`} score={analysis.runway_readiness.score} rationale={analysis.runway_readiness.rationale} />
          </SectionCard>
          <SectionCard title="Production Difficulty">
            <RatingBlock tier={analysis.production_difficulty.level} score={analysis.production_difficulty.score} rationale={analysis.production_difficulty.rationale} />
          </SectionCard>

          <SectionCard title="Suggested Design Improvements"><Bullets items={analysis.design_improvements} /></SectionCard>
          <SectionCard title="CLO3D Preparation Notes"><Bullets items={analysis.clo3d_notes} /></SectionCard>
          <SectionCard title="Style Recommendations"><Bullets items={analysis.style_recommendations} /></SectionCard>
          <SectionCard title="Technical Notes"><Bullets items={analysis.technical_notes} /></SectionCard>

          {/* Save with project */}
          <Card className="border-border bg-card p-5">
            <p className="text-gold text-[10px] tracking-[0.35em] uppercase">Archive</p>
            <h3 className="font-display mt-1 text-xl">Save Analysis with a Project</h3>
            <p className="mt-1 text-xs text-muted-foreground">Attach this couture report to one of your ORIVEX designs.</p>

            {projects.length === 0 ? (
              <p className="mt-3 text-xs italic text-muted-foreground">
                No projects yet — create one from <span className="text-foreground">New Design</span> to save analyses.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="sm:flex-1">
                    <SelectValue placeholder="Select a project…" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={onSaveToProject}
                  disabled={saving || !selectedProject}
                  className="bg-gold-gradient text-[oklch(0.14_0.05_265)] hover:opacity-90 shadow-gold"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Save with Project
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Designer Notes */}
      <Card className="mt-5 border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gold text-[10px] tracking-[0.35em] uppercase">Designer Notes</p>
            <h3 className="font-display mt-1 text-xl">Your Atelier Journal</h3>
          </div>
          {savedAt && (
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
              Saved {new Date(savedAt).toLocaleString()}
            </p>
          )}
        </div>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Fit notes, seam ideas, atelier decisions, revisions…"
          className="mt-3 min-h-[140px]"
        />
        <Button onClick={onSaveNotes} className="mt-3 w-full bg-gold-gradient text-[oklch(0.14_0.05_265)] hover:opacity-90 shadow-gold">
          <Save className="mr-2 h-4 w-4" /> Save Notes
        </Button>
      </Card>

      {/* CLO3D Assistant — Working Version */}
      {analysis && (
        <Card className="mt-5 border-none bg-luxe p-6 text-white shadow-luxe">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Box className="mt-0.5 h-5 w-5 text-[oklch(0.85_0.13_85)]" />
              <div>
                <p className="text-[10px] tracking-[0.4em] uppercase text-[oklch(0.85_0.13_85)]">CLO3D Assistant</p>
                <h3 className="font-display mt-1 text-2xl">Couture Production Plan</h3>
                <p className="mt-1 text-sm text-white/70">
                  Generate a complete CLO3D workflow, fabric physics, patterns, sewing map, difficulty, timing, and shopping list.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={onGenerateClo3d}
            disabled={clo3dLoading}
            className="mt-4 w-full bg-gold-gradient text-[oklch(0.14_0.05_265)] hover:opacity-90 shadow-gold"
          >
            {clo3dLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {clo3dLoading ? "Building CLO3D plan…" : clo3d ? "Regenerate CLO3D Plan" : "Generate CLO3D Plan"}
          </Button>

          {clo3d && (
            <div className="mt-6 space-y-5 animate-fade-up">
              {/* Workflow */}
              <LuxeBlock icon={Compass} title="CLO3D Workflow">
                <ol className="space-y-2">
                  {clo3d.workflow.map((w, i) => (
                    <li key={i} className="rounded-xl border border-white/10 bg-black/25 p-3">
                      <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.85_0.13_85)]">Step {i + 1}</p>
                      <p className="font-display text-sm mt-1">{w.step}</p>
                      <p className="mt-1 text-xs text-white/70 leading-relaxed">{w.detail}</p>
                    </li>
                  ))}
                </ol>
              </LuxeBlock>

              {/* Fabric physics table */}
              <LuxeBlock icon={Layers} title="Fabric Physics Presets">
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-black/40 text-[oklch(0.85_0.13_85)]">
                      <tr>
                        {["Fabric", "Preset", "Weight", "Thick.", "Stretch", "Bending", "Shear", "Buckle", "Damping"].map((h) => (
                          <th key={h} className="whitespace-nowrap px-3 py-2 font-normal tracking-[0.15em] uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {clo3d.fabric_physics.map((f, i) => (
                        <tr key={i} className="border-t border-white/5 text-white/85">
                          <td className="whitespace-nowrap px-3 py-2 font-medium">{f.fabric}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-[oklch(0.85_0.13_85)]">{f.preset}</td>
                          <td className="whitespace-nowrap px-3 py-2">{f.weight}</td>
                          <td className="whitespace-nowrap px-3 py-2">{f.thickness}</td>
                          <td className="whitespace-nowrap px-3 py-2">{f.stretch}</td>
                          <td className="whitespace-nowrap px-3 py-2">{f.bending}</td>
                          <td className="whitespace-nowrap px-3 py-2">{f.shear}</td>
                          <td className="whitespace-nowrap px-3 py-2">{f.buckling}</td>
                          <td className="whitespace-nowrap px-3 py-2">{f.damping}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </LuxeBlock>

              {/* Pattern Planning */}
              <LuxeBlock icon={Ruler} title="Pattern Planning">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <PatternGroup label="Bodice" items={clo3d.pattern_planning.bodice} />
                  <PatternGroup label="Sleeve" items={clo3d.pattern_planning.sleeve} />
                  <PatternGroup label="Skirt Panels" items={clo3d.pattern_planning.skirt} />
                  <PatternGroup label="Collar" items={clo3d.pattern_planning.collar} />
                  <PatternGroup label="Waistband" items={clo3d.pattern_planning.waistband} />
                  <PatternGroup label="Lining" items={clo3d.pattern_planning.lining} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <StatTile label="Estimated Pieces" value={String(clo3d.pattern_planning.estimated_pieces)} />
                  <StatTile label="Complexity" value={clo3d.pattern_planning.complexity} />
                </div>
              </LuxeBlock>

              {/* Sewing map */}
              <LuxeBlock icon={Scissors} title="Sewing Map">
                <ol className="space-y-2">
                  {clo3d.sewing_map.map((s) => (
                    <li key={s.step} className="flex gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
                      <span className="font-display text-[oklch(0.85_0.13_85)] text-sm">{String(s.step).padStart(2, "0")}</span>
                      <span className="text-xs text-white/85 leading-relaxed">{s.instruction}</span>
                    </li>
                  ))}
                </ol>
              </LuxeBlock>

              {/* Difficulty */}
              <LuxeBlock icon={Gauge} title="Difficulty Meter">
                <DifficultyMeter level={clo3d.difficulty.level} />
                <p className="mt-3 text-xs text-white/70 leading-relaxed">{clo3d.difficulty.rationale}</p>
              </LuxeBlock>

              {/* Production time */}
              <LuxeBlock icon={Clock} title="Estimated Production Time">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <StatTile label="Pattern" value={`${clo3d.production_time.pattern_hours}h`} />
                  <StatTile label="Sewing" value={`${clo3d.production_time.sewing_hours}h`} />
                  <StatTile label="Simulation" value={`${clo3d.production_time.simulation_hours}h`} />
                  <StatTile label="Rendering" value={`${clo3d.production_time.rendering_hours}h`} />
                  <StatTile label="Total" value={`${clo3d.production_time.total_hours}h`} highlight />
                </div>
              </LuxeBlock>

              {/* Shopping list */}
              <LuxeBlock icon={ShoppingBag} title="Material Shopping List">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {Object.entries(clo3d.shopping_list).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                      <span className="text-[10px] tracking-[0.25em] uppercase text-white/60">{k.replace(/_/g, " ")}</span>
                      <span className="text-sm text-white">{v}</span>
                    </div>
                  ))}
                </div>
              </LuxeBlock>

              {/* Export Panel */}
              <LuxeBlock icon={ScrollText} title="Export Panel">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    { icon: FileDown, label: "Export to PDF" },
                    { icon: Download, label: "Export CLO3D Guide" },
                    { icon: ScrollText, label: "Export Technical Sheet" },
                  ].map(({ icon: Icon, label }) => (
                    <button
                      key={label}
                      disabled
                      className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-xs text-white/70 disabled:cursor-not-allowed"
                    >
                      <Icon className="h-4 w-4 text-[oklch(0.85_0.13_85)]" />
                      {label}
                      <span className="ml-1 rounded-full border border-white/20 px-2 py-0.5 text-[9px] tracking-[0.2em] uppercase">Soon</span>
                    </button>
                  ))}
                </div>
              </LuxeBlock>

              <Button
                onClick={onSaveClo3dToProject}
                disabled={savingClo3d || !selectedProject}
                className="w-full bg-gold-gradient text-[oklch(0.14_0.05_265)] hover:opacity-90 shadow-gold"
              >
                {savingClo3d ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {selectedProject ? "Save CLO3D Plan with Project" : "Select a project above to save this plan"}
              </Button>
            </div>
          )}

        </Card>
      )}

      {/* Fashion Engineering Suite */}
      {analysis && (
        <Card className="mt-5 border-none bg-luxe p-6 text-white shadow-luxe">
          <div className="flex items-start gap-3">
            <ClipboardList className="mt-0.5 h-5 w-5 text-[oklch(0.85_0.13_85)]" />
            <div className="flex-1">
              <p className="text-[10px] tracking-[0.4em] uppercase text-[oklch(0.85_0.13_85)]">Fashion Engineering</p>
              <h3 className="font-display mt-1 text-2xl">Advanced Production Suite</h3>
              <p className="mt-1 text-sm text-white/70">
                Pattern draft, sewing blueprint, optimized fabric physics, construction risk detection, and full technical sheet.
              </p>
            </div>
          </div>

          <Button
            onClick={onGenerateEngineering}
            disabled={engLoading}
            className="mt-4 w-full bg-gold-gradient text-[oklch(0.14_0.05_265)] hover:opacity-90 shadow-gold"
          >
            {engLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {engLoading ? "Engineering couture…" : engineering ? "Regenerate Engineering Suite" : "Generate Engineering Suite"}
          </Button>

          {engineering && (
            <div className="mt-6 space-y-5 animate-fade-up">
              {/* Pattern Draft */}
              <LuxeBlock icon={Ruler} title="Pattern Draft Generator">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {engineering.pattern_draft.map((p, i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-black/25 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-display text-base text-white">{p.name}</p>
                          <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.85_0.13_85)]">{p.side} · Cut {p.cut_quantity}</p>
                        </div>
                        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-white/70">{p.fabric_type}</span>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                        <SpecRow label="Grainline" value={p.grainline} />
                        <SpecRow label="Seam Allow." value={p.seam_allowance} />
                        <SpecRow label="Fold Line" value={p.fold_line} />
                        <SpecRow label="Notches" value={p.notches} />
                        <SpecRow label="Internal Lines" value={p.internal_lines} />
                        <SpecRow label="Measurements" value={p.measurements} />
                      </dl>
                      <p className="mt-3 border-t border-white/10 pt-2 text-xs leading-relaxed text-white/70">{p.explanation}</p>
                    </div>
                  ))}
                </div>
              </LuxeBlock>

              {/* Sewing Blueprint */}
              <LuxeBlock icon={Scissors} title="Sewing Blueprint">
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-black/40 text-[oklch(0.85_0.13_85)]">
                      <tr>
                        {["#", "Operation", "Machine", "Stitch", "Seam", "Reinforce", "Press", "Difficulty", "Time"].map((h) => (
                          <th key={h} className="whitespace-nowrap px-3 py-2 font-normal tracking-[0.15em] uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {engineering.sewing_blueprint.map((s) => (
                        <tr key={s.order} className="border-t border-white/5 text-white/85 align-top">
                          <td className="px-3 py-2 text-[oklch(0.85_0.13_85)]">{String(s.order).padStart(2, "0")}</td>
                          <td className="px-3 py-2 font-medium">{s.operation}</td>
                          <td className="px-3 py-2">{s.machine}</td>
                          <td className="px-3 py-2">{s.stitch}</td>
                          <td className="px-3 py-2">{s.seam}</td>
                          <td className="px-3 py-2">{s.reinforcement}</td>
                          <td className="px-3 py-2">{s.pressing}</td>
                          <td className="px-3 py-2">{s.difficulty}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-[oklch(0.9_0.14_85)]">{s.estimated_minutes}m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </LuxeBlock>

              {/* Fabric Physics Optimizer */}
              <LuxeBlock icon={Sliders} title="Fabric Physics Optimizer">
                <div className="space-y-4">
                  {engineering.fabric_physics.map((f, i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-black/25 p-4">
                      <p className="font-display text-base text-white">{f.fabric}</p>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {([
                          ["Weight", f.weight],
                          ["Thickness", f.thickness],
                          ["Stretch Warp", f.stretch_warp],
                          ["Stretch Weft", f.stretch_weft],
                          ["Shear", f.shear],
                          ["Bending", f.bending],
                          ["Buckling", f.buckling],
                          ["Damping", f.damping],
                          ["Friction", f.friction],
                          ["Density", f.density],
                        ] as const).map(([label, v]) => (
                          <div key={label} className="rounded-lg border border-white/10 bg-black/30 p-2.5">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">{label}</span>
                              <span className="font-display text-sm text-[oklch(0.9_0.14_85)]">{v.value}</span>
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-white/65">{v.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </LuxeBlock>

              {/* Risk Detector */}
              <LuxeBlock icon={ShieldAlert} title="Construction Risk Detector">
                <ul className="space-y-2">
                  {engineering.risk_detector.map((r, i) => (
                    <li key={i} className="rounded-xl border border-white/10 bg-black/25 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display text-sm text-white">{r.area}</p>
                        <RiskBadge level={r.risk_level} />
                      </div>
                      <p className="mt-2 text-xs text-white/75 leading-relaxed"><span className="text-white/50">Issue: </span>{r.issue}</p>
                      <p className="mt-1 text-xs text-[oklch(0.9_0.14_85)] leading-relaxed"><span className="text-white/50">Fix: </span>{r.fix}</p>
                    </li>
                  ))}
                </ul>
              </LuxeBlock>

              {/* Technical Sheet */}
              <LuxeBlock icon={Shirt} title="Professional Technical Sheet">
                <div className="rounded-xl border border-[oklch(0.85_0.13_85)]/30 bg-black/40 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-[oklch(0.85_0.13_85)]">ORIVEX Tech Pack</p>
                      <p className="font-display mt-1 text-lg text-white">{engineering.technical_sheet.category}</p>
                    </div>
                    <div className="text-right text-[10px] uppercase tracking-[0.2em] text-white/60">
                      <p>Code · <span className="text-white">{engineering.technical_sheet.garment_code}</span></p>
                      <p>Season · <span className="text-white">{engineering.technical_sheet.season}</span></p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <TechBlock label="Flat Sketch — Front">{engineering.technical_sheet.flat_sketch_front}</TechBlock>
                    <TechBlock label="Flat Sketch — Back">{engineering.technical_sheet.flat_sketch_back}</TechBlock>
                  </div>

                  <TechList label="Construction Notes" items={engineering.technical_sheet.construction_notes} />

                  <TechTable
                    label="Fabric List"
                    headers={["Fabric", "Usage", "Quantity"]}
                    rows={engineering.technical_sheet.fabric_list.map((f) => [f.fabric, f.usage, f.quantity])}
                  />
                  <TechTable
                    label="Trims"
                    headers={["Item", "Specification", "Quantity"]}
                    rows={engineering.technical_sheet.trims.map((t) => [t.item, t.specification, t.quantity])}
                  />
                  <TechTable
                    label="Measurements"
                    headers={["Point", "Value"]}
                    rows={engineering.technical_sheet.measurements.map((m) => [m.point, m.value])}
                  />

                  <TechList label="Sewing Notes" items={engineering.technical_sheet.sewing_notes} />

                  <TechTable
                    label="Embroidery Map"
                    headers={["Placement", "Technique", "Thread"]}
                    rows={engineering.technical_sheet.embroidery_map.map((e) => [e.placement, e.technique, e.thread])}
                  />

                  <div className="mt-4">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-[oklch(0.85_0.13_85)]">Color Codes</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {engineering.technical_sheet.color_codes.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 p-2">
                          <span className="h-9 w-9 shrink-0 rounded border border-white/20" style={{ backgroundColor: c.hex }} />
                          <div className="min-w-0">
                            <p className="truncate text-xs text-white">{c.name}</p>
                            <p className="text-[10px] uppercase tracking-[0.15em] text-white/60">{c.hex} · {c.pantone}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <TechList label="Production Notes" items={engineering.technical_sheet.production_notes} />
                </div>
              </LuxeBlock>

              <Button
                onClick={onSaveEngToProject}
                disabled={savingEng || !selectedProject}
                className="w-full bg-gold-gradient text-[oklch(0.14_0.05_265)] hover:opacity-90 shadow-gold"
              >
                {savingEng ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {selectedProject ? "Save Engineering Suite with Project" : "Select a project above to save this suite"}
              </Button>
            </div>
          )}

        </Card>
      )}




      {/* CLO3D upsell when no analysis yet */}
      {!analysis && (
        <Card className="mt-5 border-none bg-luxe p-6 text-white shadow-luxe">
          <div className="flex items-start gap-3">
            <Box className="mt-0.5 h-5 w-5 text-[oklch(0.85_0.13_85)]" />
            <div>
              <p className="text-[10px] tracking-[0.4em] uppercase text-[oklch(0.85_0.13_85)]">CLO3D Assistant</p>
              <h3 className="font-display mt-1 text-2xl">Couture Production Plan</h3>
              <p className="mt-1 text-sm text-white/70">
                Analyze a design above to unlock the full CLO3D plan — workflow, fabric physics, patterns, sewing map, difficulty, timing, and shopping list.
              </p>
            </div>
          </div>
        </Card>
      )}
    </AppShell>

  );
}




function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border bg-card p-5">
      <p className="text-gold text-[10px] tracking-[0.35em] uppercase">{title}</p>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (!items?.length) return <p className="text-xs italic text-muted-foreground">—</p>;
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

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>;
}

function ScoreTile({
  icon: Icon,
  label,
  value,
  score,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  score: number;
}) {
  const pct = Math.max(0, Math.min(100, (score / 10) * 100));
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[oklch(0.85_0.13_85)]" />
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/70">{label}</p>
      </div>
      <p className="font-display mt-2 text-lg leading-tight">{value}</p>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-[oklch(0.85_0.13_85)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RatingBlock({ tier, score, rationale }: { tier: string; score: number; rationale: string }) {
  const pct = Math.max(0, Math.min(100, (score / 10) * 100));
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-display text-lg">{tier}</p>
        <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">{score}/10</p>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-gold-gradient" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{rationale}</p>
    </div>
  );
}

function LuxeBlock({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[oklch(0.85_0.13_85)]" />
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/70">{title}</p>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function PatternGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.85_0.13_85)]">{label}</p>
      {items?.length ? (
        <ul className="mt-2 space-y-1">
          {items.map((i, idx) => (
            <li key={idx} className="text-xs text-white/85">• {i}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs italic text-white/50">—</p>
      )}
    </div>
  );
}

function StatTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "border-[oklch(0.85_0.13_85)]/60 bg-[oklch(0.85_0.13_85)]/10" : "border-white/10 bg-black/25"}`}>
      <p className="text-[10px] tracking-[0.25em] uppercase text-white/60">{label}</p>
      <p className={`font-display mt-1 text-lg ${highlight ? "text-[oklch(0.9_0.14_85)]" : "text-white"}`}>{value}</p>
    </div>
  );
}

function DifficultyMeter({ level }: { level: string }) {
  const tiers = ["Beginner", "Intermediate", "Advanced", "Haute Couture"];
  const idx = Math.max(0, tiers.findIndex((t) => t.toLowerCase() === level.toLowerCase()));
  return (
    <div className="grid grid-cols-4 gap-2">
      {tiers.map((t, i) => {
        const active = i <= idx;
        const current = i === idx;
        return (
          <div
            key={t}
            className={`rounded-xl border px-2 py-3 text-center text-[10px] tracking-[0.15em] uppercase ${
              current
                ? "border-[oklch(0.85_0.13_85)] bg-[oklch(0.85_0.13_85)]/15 text-[oklch(0.9_0.14_85)]"
                : active
                ? "border-white/25 bg-white/5 text-white/80"
                : "border-white/10 bg-black/20 text-white/40"
            }`}
          >
            {t}
          </div>
        );
      })}
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-[10px] uppercase tracking-[0.2em] text-white/50">{label}</dt>
      <dd className="text-[11px] text-white/90">{value}</dd>
    </>
  );
}

function RiskBadge({ level }: { level: string }) {
  const l = level.toLowerCase();
  const cls =
    l === "high"
      ? "border-red-400/40 bg-red-500/15 text-red-200"
      : l === "medium"
      ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
      : "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] ${cls}`}>
      {level}
    </span>
  );
}

function TechBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-3">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[oklch(0.85_0.13_85)]">{label}</p>
      <p className="mt-2 text-xs leading-relaxed text-white/80">{children}</p>
    </div>
  );
}

function TechList({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-4">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[oklch(0.85_0.13_85)]">{label}</p>
      <ul className="mt-2 space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-xs text-white/80">• {it}</li>
        ))}
      </ul>
    </div>
  );
}

function TechTable({ label, headers, rows }: { label: string; headers: string[]; rows: string[][] }) {
  if (!rows?.length) return null;
  return (
    <div className="mt-4">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[oklch(0.85_0.13_85)]">{label}</p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-black/40 text-white/60">
            <tr>
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 font-normal uppercase tracking-[0.15em]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-white/5 text-white/85">
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-2 align-top">{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
