import { cn } from "@/lib/utils";

/**
 * Assinatura discreta exibida em todas as telas do produto.
 * Tipografia pequena, baixo contraste — presente, nunca protagonista.
 */
export function Signature({
  variant = "inline",
  tone = "light",
}: {
  variant?: "inline" | "fixed";
  tone?: "light" | "dark";
}) {
  return (
    <p
      className={cn(
        "select-none text-center text-[10.5px] font-medium tracking-wide",
        tone === "dark" ? "text-[#4a4039]" : "text-ink-faint/70",
        variant === "fixed" && "pointer-events-none fixed bottom-2 right-3 z-10"
      )}
    >
      By João Victor Kziozek
    </p>
  );
}
