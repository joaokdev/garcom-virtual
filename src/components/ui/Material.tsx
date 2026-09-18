import { forwardRef } from "react";
import type { HTMLAttributes, ElementType } from "react";
import { cn } from "@/lib/utils";

/**
 * Camada 3 do sistema visual (ver AUDIT.md, §Material System).
 *
 * Vidro é para elementos FUNCIONAIS e flutuantes — navegação, toolbars,
 * sheets, popovers, ações contextuais. NUNCA para conteúdo (produtos,
 * texto, tabelas) e NUNCA empilhado sobre outro material translúcido.
 *
 * `well`: usa o vocabulário escuro da "sala de controle" (Cozinha,
 * Garçom, Financeiro, Admin) em vez do vocabulário claro do Cliente.
 */
type Level = "ultraThin" | "thin" | "regular" | "thick";

const LEVEL_CLASS: Record<Level, string> = {
  ultraThin: "material-ultra-thin",
  thin: "material-thin",
  regular: "material-regular",
  thick: "material-thick",
};

const WELL_LEVEL_CLASS: Partial<Record<Level, string>> = {
  thin: "material-well-thin",
  regular: "material-well-regular",
};

interface MaterialProps extends HTMLAttributes<HTMLDivElement> {
  level?: Level;
  well?: boolean;
  as?: ElementType;
}

export const Material = forwardRef<HTMLDivElement, MaterialProps>(
  ({ level = "regular", well = false, as: Component = "div", className, ...props }, ref) => {
    const materialClass = well
      ? WELL_LEVEL_CLASS[level] ?? WELL_LEVEL_CLASS.regular
      : LEVEL_CLASS[level];

    return (
      <Component
        ref={ref}
        className={cn(materialClass, className)}
        {...props}
      />
    );
  }
);
Material.displayName = "Material";
