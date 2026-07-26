import { Link, useLocation } from "@tanstack/react-router";
import { Home, Sparkles, FolderHeart, MessageCircle, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark, BrandWordmark } from "./BrandLogo";
import type { ReactNode } from "react";

export function AppShell({ children, title, subtitle, action }: { children: ReactNode; title?: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <BrandMark className="h-7 w-7" />
            <BrandWordmark size="sm" />
          </Link>
          {action}
        </div>
        {(title || subtitle) && (
          <div className="mx-auto max-w-2xl px-5 pb-5">
            {subtitle && (
              <p className="text-gold text-[10px] tracking-[0.35em] uppercase mb-1">{subtitle}</p>
            )}
            {title && <h1 className="font-display text-3xl leading-tight">{title}</h1>}
          </div>
        )}
      </header>
      <main className="mx-auto max-w-2xl px-5 pb-28 pt-6">{children}</main>
      <BottomNav />
    </div>
  );
}

const items = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/new-design", label: "Create", icon: Sparkles },
  { to: "/projects", label: "Projects", icon: FolderHeart },
  { to: "/assistant", label: "Assistant", icon: MessageCircle },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {items.map(({ to, label, icon: Icon }) => {
          const active = loc.pathname === to || loc.pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] tracking-[0.2em] uppercase transition",
                active ? "text-gold" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_currentColor]")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
