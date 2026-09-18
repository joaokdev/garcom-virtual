"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, UtensilsCrossed } from "lucide-react";
import { formatCurrencyCents } from "@/lib/i18n";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { MenuItem } from "@/types";

function RecoImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-line/50 text-ink-faint">
        <UtensilsCrossed className="h-6 w-6" strokeWidth={1.2} />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="160px"
      className="object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export function RecommendedSection({
  items,
  onSelect,
}: {
  items: MenuItem[];
  onSelect: (item: MenuItem) => void;
}) {
  const { t, text } = useTranslation();
  if (items.length === 0) return null;

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center gap-1.5 px-5 sm:px-6">
        <Sparkles className="h-3.5 w-3.5 text-ink-faint" />
        <h2 className="text-[12px] font-bold uppercase tracking-widest text-ink-faint">
          {t("menu.recommendedForYou")}
        </h2>
      </div>

      <div className="scroll-no-bar flex gap-3 overflow-x-auto px-5 pb-1 sm:px-6">
        {items.map((item, index) => (
          <motion.button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.06, ease: [0.22, 1, 0.36, 1] }}
            whileTap={{ scale: 0.96 }}
            className="group relative flex w-40 shrink-0 flex-col overflow-hidden rounded-[var(--radius-lg)] bg-paper shadow-[var(--shadow-card)]"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-line/40">
              <RecoImage src={item.imageUrl} alt={text(item.name)} />
            </div>
            <div className="space-y-0.5 p-3">
              <p className="line-clamp-1 text-[13px] font-semibold text-ink">{text(item.name)}</p>
              <p className="font-mono text-[12px] font-semibold text-ink-soft">
                {formatCurrencyCents(item.priceCents)}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
