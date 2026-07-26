import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Sparkles, FolderHeart, MessageCircle, Settings as SettingsIcon, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const user = Route.useRouteContext().user;
  const name = user.user_metadata?.full_name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "Designer";

  return (
    <AppShell subtitle={`Bonjour, ${name}`} title="Your Atelier">
      <p className="text-muted-foreground -mt-2 mb-6 text-sm">
        Compose collections, refine ideas, and let intelligence guide your craft.
      </p>

      <div className="grid grid-cols-1 gap-4">
        <FeatureCard
          to="/new-design"
          eyebrow="Signature"
          title="New Design"
          description="Describe an idea. Receive fabrics, palette, embroidery."
          icon={Sparkles}
          featured
        />
        <div className="grid grid-cols-2 gap-4">
          <FeatureCard to="/projects" eyebrow="Archive" title="My Projects" description="Saved concepts" icon={FolderHeart} />
          <FeatureCard to="/assistant" eyebrow="Muse" title="AI Assistant" description="Chat with the atelier" icon={MessageCircle} />
        </div>
        <FeatureCard to="/settings" eyebrow="House" title="Settings" description="Theme, language, notifications" icon={SettingsIcon} />
      </div>

      <div className="mt-8 rounded-2xl bg-luxe p-6 text-white shadow-luxe">
        <p className="text-[10px] tracking-[0.4em] uppercase text-[oklch(0.85_0.13_85)]">Maison Note</p>
        <p className="font-display mt-2 text-xl leading-snug">
          "A garment is a whispered idea, tailored into presence."
        </p>
      </div>
    </AppShell>
  );
}

function FeatureCard({
  to, eyebrow, title, description, icon: Icon, featured,
}: {
  to: string; eyebrow: string; title: string; description: string; icon: LucideIcon; featured?: boolean;
}) {
  if (featured) {
    return (
      <Link
        to={to}
        className="group relative overflow-hidden rounded-2xl bg-luxe p-6 text-white shadow-luxe transition hover:shadow-gold"
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-gradient opacity-30 blur-3xl transition group-hover:opacity-50" />
        <div className="relative">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[oklch(0.85_0.13_85)]">{eyebrow}</p>
          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-3xl">{title}</h3>
              <p className="mt-1 text-sm text-white/70">{description}</p>
            </div>
            <div className="rounded-full bg-gold-gradient p-3 text-[oklch(0.14_0.05_265)]">
              <Icon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase text-[oklch(0.85_0.13_85)]">
            Begin <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
      </Link>
    );
  }
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-luxe gold-hairline"
    >
      <div className="flex items-center justify-between">
        <p className="text-gold text-[10px] tracking-[0.35em] uppercase">{eyebrow}</p>
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-gold transition" />
      </div>
      <h3 className="font-display mt-3 text-xl">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </Link>
  );
}
