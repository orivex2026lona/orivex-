import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BrandMark, BrandWordmark } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: SplashScreen,
});

function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate({ to: "/dashboard", replace: true });
      } else {
        navigate({ to: "/auth", replace: true });
      }
    }, 2200);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-luxe">
      {/* gold sweep */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-0 h-px w-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-[oklch(0.85_0.13_85)] to-transparent animate-gold-sweep" />
      </div>

      <div className="flex flex-col items-center gap-6 px-6 text-center">
        <div className="animate-fade-up">
          <BrandMark className="h-20 w-20 drop-shadow-[0_6px_24px_rgba(212,175,55,0.35)]" />
        </div>
        <BrandWordmark
          size="xl"
          className="text-white animate-shimmer-in"
        />
        <div className="h-px w-24 bg-gradient-to-r from-transparent via-[oklch(0.85_0.13_85)] to-transparent" />
        <p
          className="font-display italic text-[oklch(0.85_0.13_85)] text-lg animate-fade-up"
          style={{ animationDelay: "600ms" }}
        >
          Where Fashion Meets Intelligence
        </p>
      </div>

      <p
        className="absolute bottom-8 text-xs tracking-[0.4em] uppercase text-white/40 animate-fade-up"
        style={{ animationDelay: "1000ms" }}
      >
        Atelier · 2026
      </p>
    </div>
  );
}
