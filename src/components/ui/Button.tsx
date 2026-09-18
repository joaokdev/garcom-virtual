"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "glass";
type Size = "md" | "lg";

// Omitimos os handlers de drag/animação nativos do HTML porque o
// framer-motion (motion.button) já define esses mesmos nomes de prop com
// uma assinatura própria (PanInfo em vez de DragEvent) — sem isso o
// TypeScript vê como um conflito de tipos incompatíveis.
type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
>;

interface ButtonProps extends NativeButtonProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-brand text-brand-foreground hover:brightness-[1.04] active:brightness-95 shadow-lift",
  secondary:
    "bg-paper text-ink border border-line hover:bg-stone active:bg-stone",
  ghost: "bg-transparent text-ink hover:bg-paper/60 active:bg-paper",
  danger: "bg-danger text-white hover:brightness-105 active:brightness-95",
  // Camada 3 (funcional/flutuante) — usar só sobre conteúdo, nunca sobre
  // outro material translúcido. Ex.: ação flutuante sobre o cardápio.
  glass: "material-thick text-ink hover:brightness-[1.02] active:brightness-95 shadow-md",
};

const SIZE_CLASSES: Record<Size, string> = {
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-14 px-6 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", loading, fullWidth, icon, className, children, disabled, ...props },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        disabled={disabled || loading}
        whileTap={disabled || loading ? undefined : { scale: 0.965 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        className={cn(
          "inline-flex items-center justify-center rounded-[var(--radius-lg)] font-semibold tracking-[-0.01em] transition-colors duration-150 disabled:opacity-45 disabled:pointer-events-none select-none",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-[1.1em] w-[1.1em] animate-spin" aria-hidden="true" />
        ) : (
          icon
        )}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
