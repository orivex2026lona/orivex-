import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { listDesigns, deleteDesign, updateDesignTitle } from "@/lib/design.functions";
import { listCollections } from "@/lib/collections.functions";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, FolderHeart, Image as ImageIcon, Layers, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
});

type ProjectRow = {
  id: string;
  title: string;
  prompt: string;
  summary: string | null;
  colors: { name: string; hex: string }[] | null;
  image_url: string | null;
  created_at: string;
};

type CollectionRow = {
  id: string;
  name: string;
  theme: string | null;
  cover_image_url: string | null;
  looks: { colors?: { hex: string }[] }[];
  created_at: string;
};

function ProjectsPage() {
  const [tab, setTab] = useState<"designs" | "collections">("designs");
  const list = useServerFn(listDesigns);
  const listColl = useServerFn(listCollections);
  const dq = useQuery<ProjectRow[]>({
    queryKey: ["designs"],
    queryFn: async () => (await list()) as unknown as ProjectRow[],
  });
  const cq = useQuery<CollectionRow[]>({
    queryKey: ["collections"],
    queryFn: async () => (await listColl()) as unknown as CollectionRow[],
  });

  return (
    <AppShell subtitle="Archive" title="My Projects">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-full border border-border bg-card p-1">
        <TabBtn active={tab === "designs"} onClick={() => setTab("designs")}>
          Designs {dq.data?.length ? `· ${dq.data.length}` : ""}
        </TabBtn>
        <TabBtn active={tab === "collections"} onClick={() => setTab("collections")}>
          Collections {cq.data?.length ? `· ${cq.data.length}` : ""}
        </TabBtn>
      </div>

      {tab === "designs" && (
        <>
          {dq.isLoading && <p className="text-muted-foreground text-sm">Loading your atelier…</p>}
          {dq.data?.length === 0 && (
            <EmptyState
              icon={<FolderHeart className="mx-auto h-8 w-8 text-muted-foreground" />}
              title="No designs yet"
              cta={<Link to="/new-design"><Button className="bg-gold-gradient text-[oklch(0.14_0.05_265)]">Create your first</Button></Link>}
            />
          )}
          <div className="space-y-3">
            {dq.data?.map((d) => <ProjectCard key={d.id} d={d} />)}
          </div>
        </>
      )}

      {tab === "collections" && (
        <>
          {cq.isLoading && <p className="text-muted-foreground text-sm">Loading collections…</p>}
          {cq.data?.length === 0 && (
            <EmptyState
              icon={<Layers className="mx-auto h-8 w-8 text-muted-foreground" />}
              title="No collections yet"
              subtitle="Open a design and use “Create Collection” to expand it into 5 looks."
            />
          )}
          <div className="space-y-3">
            {cq.data?.map((c) => <CollectionCard key={c.id} c={c} />)}
          </div>
        </>
      )}
    </AppShell>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-2 text-[10px] tracking-[0.25em] uppercase transition ${
        active ? "bg-gold-gradient text-[oklch(0.14_0.05_265)] shadow-gold" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ icon, title, subtitle, cta }: { icon: React.ReactNode; title: string; subtitle?: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
      {icon}
      <p className="font-display mt-3 text-xl">{title}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}

function ProjectCard({ d }: { d: ProjectRow }) {
  const qc = useQueryClient();
  const router = useRouter();
  const del = useServerFn(deleteDesign);
  const upd = useServerFn(updateDesignTitle);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(d.title);

  function open() {
    router.navigate({ to: "/design/$id", params: { id: d.id } });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex gap-4 p-4">
        <button
          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-luxe"
          onClick={open}
          aria-label="Open design"
        >
          {d.image_url ? (
            <img src={d.image_url} alt={d.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-white/60">
              <ImageIcon className="h-5 w-5 text-[oklch(0.85_0.13_85)]" />
              <span className="mt-1 text-[9px] tracking-[0.2em] uppercase">No visual</span>
            </div>
          )}
        </button>
        <button className="flex-1 text-left" onClick={open}>
          <p className="text-gold text-[10px] tracking-[0.3em] uppercase">
            {new Date(d.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
          </p>
          <h3 className="font-display mt-1 text-xl leading-tight line-clamp-1">{d.title}</h3>
          {d.summary && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{d.summary}</p>}
          {d.colors && (
            <div className="mt-2 flex gap-1.5">
              {d.colors.slice(0, 6).map((c, i) => (
                <span key={i} className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
              ))}
            </div>
          )}
        </button>
        <div className="flex flex-col gap-1">
          <Dialog open={editing} onOpenChange={setEditing}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Rename design</DialogTitle></DialogHeader>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              <DialogFooter>
                <Button
                  onClick={async () => {
                    await upd({ data: { id: d.id, title } });
                    await qc.invalidateQueries({ queryKey: ["designs"] });
                    setEditing(false);
                    toast.success("Renamed");
                  }}
                  className="bg-primary text-primary-foreground"
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            size="icon"
            variant="ghost"
            onClick={async () => {
              if (!confirm("Delete this design?")) return;
              await del({ data: { id: d.id } });
              await qc.invalidateQueries({ queryKey: ["designs"] });
              toast.success("Deleted");
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CollectionCard({ c }: { c: CollectionRow }) {
  const swatches = (c.looks ?? []).flatMap((l) => l.colors ?? []).slice(0, 8);
  return (
    <Link
      to="/collections/$id"
      params={{ id: c.id }}
      className="block overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-luxe transition"
    >
      <div className="relative h-32 w-full overflow-hidden bg-luxe">
        {c.cover_image_url ? (
          <img src={c.cover_image_url} alt={c.name} className="h-full w-full object-cover opacity-90" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/60">
            <Layers className="h-8 w-8 text-[oklch(0.85_0.13_85)]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="text-[10px] tracking-[0.35em] uppercase text-[oklch(0.85_0.13_85)] flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Collection · {(c.looks ?? []).length} looks
          </p>
          <h3 className="font-display text-xl leading-tight line-clamp-1">{c.name}</h3>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          {c.theme && <p className="text-xs text-muted-foreground line-clamp-1">{c.theme}</p>}
          <p className="mt-1 text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
            {new Date(c.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
          </p>
        </div>
        <div className="flex gap-1">
          {swatches.map((s, i) => (
            <span key={i} className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: s.hex }} />
          ))}
        </div>
      </div>
    </Link>
  );
}
