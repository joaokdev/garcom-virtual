import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "brand" | "accent" | "neutral" | "success" | "danger";

const TONE_CLASSES: Record<Tone, string> = {
  brand: "bg-brand text-brand-foreground",
  accent: "bg-accent text-accent-foreground",
  neutral: "bg-stone text-ink-soft",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
};

export function Badge({
  children,
  tone = "neutral",
  icon,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        // Badge continua minúsculo/sem CAPS — texto real do produto ("Aguardando",
        // "Pronto") fica ilegível em uppercase; .text-caption é para rótulos
        // curtos e fixos (ex.: "MESA", "EM PREPARO" já vem assim do dado).
        "inline-flex items-center gap-1 rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-semibold tracking-wide",
        TONE_CLASSES[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
