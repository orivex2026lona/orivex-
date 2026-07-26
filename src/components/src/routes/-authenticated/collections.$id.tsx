import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCollection, deleteCollection, type CollectionLook } from "@/lib/collections.functions";
import { ArrowLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/collections/$id")({
  component: CollectionPage,
  errorComponent: ({ error }) => (
    <AppShell title="Collection"><p className="text-sm text-destructive">{error.message}</p></AppShell>
  ),
  notFoundComponent: () => (
    <AppShell title="Collection"><p className="text-sm text-muted-foreground">Not found.</p></AppShell>
  ),
});

type Row = {
  id: string;
  name: string;
  theme: string | null;
  story: string | null;
  cover_image_url: string | null;
  looks: CollectionLook[];
  created_at: string;
};

function CollectionPage() {
  const { id } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const get = useServerFn(getCollection);
  const del = useServerFn(deleteCollection);
  const q = useQuery<Row>({
    queryKey: ["collection", id],
    queryFn: async () => (await get({ data: { id } })) as unknown as Row,
  });
  const c = q.data;

  async function onDelete() {
    if (!confirm("Delete this collection?")) return;
    await del({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["collections"] });
    toast.success("Deleted");
    router.navigate({ to: "/projects" });
  }

  return (
    <AppShell
      subtitle="Collection"
      title={c?.name ?? "Loading…"}
      action={
        <Link to="/projects" className="flex items-center gap-1 text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      }
    >
      {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {c && (
        <div className="space-y-5 animate-fade-up">
          <Card className="border-none bg-luxe p-6 text-white shadow-luxe">
            {c.cover_image_url && (
              <div className="mb-4 overflow-hidden rounded-2xl border border-white/10">
                <img src={c.cover_image_url} alt={c.name} className="aspect-[16/9] w-full object-cover" />
              </div>
            )}
            {c.theme && <p className="text-[10px] tracking-[0.4em] uppercase text-[oklch(0.85_0.13_85)]">{c.theme}</p>}
            <h2 className="font-display mt-2 text-3xl leading-tight">{c.name}</h2>
            <p className="mt-1 text-[10px] tracking-[0.25em] uppercase opacity-70">
              {new Date(c.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </p>
            {c.story && <p className="mt-4 text-sm text-white/85 leading-relaxed">{c.story}</p>}
          </Card>

          <div>
            <p className="text-gold text-[10px] tracking-[0.35em] uppercase mb-3">The Looks</p>
            <div className="space-y-3">
              {c.looks.map((l, i) => (
                <Card key={i} className="border-border bg-card p-5">
                  <div className="flex items-baseline justify-between">
                    <p className="text-gold text-[10px] tracking-[0.3em] uppercase">Look {String(i + 1).padStart(2, "0")}</p>
                    <div className="flex gap-1">
                      {l.colors.map((cc, ci) => (
                        <span key={ci} className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: cc.hex }} />
                      ))}
                    </div>
                  </div>
                  <h3 className="font-display mt-1 text-2xl">{l.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{l.silhouette}</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Block label="Fabrics" items={l.fabrics} />
                    <Block label="Embroidery" items={l.embroidery} />
                    <Block label="Styling" items={l.styling} />
                    <div>
                      <p className="text-gold text-[10px] tracking-[0.3em] uppercase mb-2">Palette</p>
                      <div className="flex flex-wrap gap-1.5">
                        {l.colors.map((cc, ci) => (
                          <div key={ci} className="flex items-center gap-1.5 rounded-full border border-border px-2 py-1">
                            <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: cc.hex }} />
                            <span className="text-[10px]">{cc.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Button variant="ghost" onClick={onDelete} className="w-full text-destructive hover:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Delete collection
          </Button>
        </div>
      )}
    </AppShell>
  );
}

function Block({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-gold text-[10px] tracking-[0.3em] uppercase mb-2">{label}</p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1.5 text-xs">
            <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-[color:var(--color-gold)]" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
