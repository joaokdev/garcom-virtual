"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { Category } from "@/types";

export function CategoryNav({
  categories,
  activeId,
  onSelect,
}: {
  categories: Category[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const { text } = useTranslation();
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeId]);

  return (
    <div className="scroll-no-bar flex gap-2 overflow-x-auto px-5 py-3 sm:px-6">
      {categories.map((category) => {
        const isActive = category.id === activeId;
        return (
          <button
            key={category.id}
            ref={isActive ? activeRef : undefined}
            type="button"
            onClick={() => onSelect(category.id)}
            className={cn(
              "relative shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold active:scale-95 transition-transform duration-150",
              isActive ? "text-paper" : "text-ink-soft hover:text-ink"
            )}
          >
            {/* Pílula que "desliza" magneticamente entre as categorias — a mesma
                camada visual se move de um botão pro outro (layoutId compartilhado)
                em vez de sumir e reaparecer, o que dá a sensação de app nativo. */}
            {isActive && (
              <motion.span
                layoutId="category-pill"
                transition={{ type: "spring", bounce: 0.22, duration: 0.5 }}
                className="absolute inset-0 rounded-full bg-ink"
              />
            )}
            {!isActive && (
              <span className="absolute inset-0 rounded-full border border-line" aria-hidden="true" />
            )}
            <span className="relative">{text(category.name)}</span>
          </button>
        );
      })}
    </div>
  );
}
