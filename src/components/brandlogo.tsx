import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-10 w-10", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="orivex-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.9 0.12 88)" />
          <stop offset="100%" stopColor="oklch(0.7 0.14 78)" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="none" stroke="url(#orivex-gold)" strokeWidth="1.2" />
      <path
        d="M32 8 L44 32 L32 56 L20 32 Z"
        fill="none"
        stroke="url(#orivex-gold)"
        strokeWidth="1.4"
      />
      <path
        d="M20 32 Q32 22 44 32 Q32 42 20 32 Z"
        fill="url(#orivex-gold)"
        opacity="0.85"
      />
      <circle cx="32" cy="32" r="2.2" fill="oklch(0.14 0.05 265)" />
    </svg>
  );
}

export function BrandWordmark({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = {
    sm: "text-lg tracking-[0.35em]",
    md: "text-2xl tracking-[0.35em]",
    lg: "text-4xl tracking-[0.4em]",
    xl: "text-6xl tracking-[0.35em]",
  };
  return (
    <span className={cn("font-display font-medium uppercase", sizes[size], className)}>
      ORIVEX
    </span>
  );
}
