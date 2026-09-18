"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: "ghost" | "solid";
  badge?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, variant = "ghost", badge, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cn(
          "relative inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-pill)] transition-all duration-150 active:scale-90 shrink-0",
          // "ghost" é a ação flutuante típica sobre conteúdo (header, cards) —
          // camada 3, por isso material em vez de superfície sólida.
          variant === "ghost" && "material-ultra-thin text-ink hover:brightness-[1.03]",
          variant === "solid" && "bg-brand text-brand-foreground hover:brightness-105",
          className
        )}
        {...props}
      >
        {icon}
        {badge && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <motion.span
              animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-danger"
            />
            <span className="relative h-2 w-2 rounded-full bg-danger ring-2 ring-paper" />
          </span>
        )}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";
