import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "brand";
}) {
  // Editorial, não "caixa com ícone" repetida 10x (regra do redesign, §28):
  // a hierarquia vem do tamanho do número, não de uma moldura ao redor dele.
  return (
    <div className="flex flex-col gap-1.5">
      <div className={cn("flex items-center gap-1.5", tone === "brand" ? "text-accent" : "text-ink-faint")}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        <p className="text-caption">{label}</p>
      </div>
      <p className="font-mono text-[2rem] font-bold leading-none tracking-tight tabular-nums text-ink">
        {value}
      </p>
      {hint && <p className="text-footnote text-ink-soft">{hint}</p>}
    </div>
  );
}
