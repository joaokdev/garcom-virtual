"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { UtensilsCrossed } from "lucide-react";
import { formatCurrencyCents } from "@/lib/i18n";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";
import type { MenuItem } from "@/types";

function ItemImage({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={cn("flex items-center justify-center bg-line/50 text-ink-faint", className)}>
        <UtensilsCrossed className="h-7 w-7" strokeWidth={1.1} />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 50vw, 280px"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export function MenuItemCard({ item, onSelect }: { item: MenuItem; onSelect: (item: MenuItem) => void }) {
  const { t, text } = useTranslation();
  const name = text(item.name);
  const description = text(item.description);
  const hasVariablePrice = item.optionGroups.some((g) => g.choices.some((c) => c.priceDeltaCents > 0));

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(item)}
      disabled={!item.isAvailable}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileTap={item.isAvailable ? { scale: 0.975 } : undefined}
      className={cn(
        "group flex w-full items-start gap-4 py-4 text-left",
        "disabled:opacity-40 disabled:cursor-not-allowed"
      )}
    >
      <ItemImage
        src={item.imageUrl}
        alt={name}
        className="h-[88px] w-[88px] shrink-0 rounded-[var(--radius-lg)] sm:h-24 sm:w-24"
      />

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-[1.05rem] font-semibold leading-snug text-ink">
            {name}
          </h3>
          <span className="shrink-0 font-mono text-[15px] font-semibold text-ink">
            {hasVariablePrice && <span className="mr-0.5 text-[11px] font-sans font-medium text-ink-faint">desde</span>}
            {formatCurrencyCents(item.priceCents)}
          </span>
        </div>

        <p className="mt-0.5 line-clamp-2 text-[13.5px] leading-relaxed text-ink-soft">
          {description}
        </p>

        {(item.isChefRecommendation || item.tags.length > 0 || !item.isAvailable) && (
          <div className="mt-1.5 flex items-center gap-2 text-[11.5px] font-medium">
            {!item.isAvailable && (
              <span className="text-danger">{t("menu.unavailable")}</span>
            )}
            {item.isAvailable && item.isChefRecommendation && (
              <span className="text-brand">{t("menu.chefRecommendation")}</span>
            )}
            {item.isAvailable && item.tags.length > 0 && (
              <span className="text-ink-faint">
                {item.isChefRecommendation && "· "}
                {item.tags.join(" · ")}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
}
