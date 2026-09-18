import { LogoMark } from "@/components/brand/LogoMark";
import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  iconClassName = "h-7 w-7",
  textClassName = "text-xl",
  color,
  tight = false,
  tagline = false,
}: {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  color?: string;
  tight?: boolean;
  /** Exibe "Garçom Virtual" abaixo do nome — usar só em contextos com espaço de sobra (hero, splash). */
  tagline?: boolean;
}) {
  return (
    <div className={cn("flex items-center", tight ? "gap-1.5" : "gap-2.5", className)}>
      <LogoMark className={iconClassName} color={color} />
      <div className="flex flex-col leading-none">
        <span
          className={cn("font-display font-bold tracking-tight", textClassName)}
          style={color ? { color } : undefined}
        >
          Quizio
        </span>
        {tagline && (
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            Garçom Virtual
          </span>
        )}
      </div>
    </div>
  );
}
