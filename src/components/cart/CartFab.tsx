"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { formatCurrencyCents } from "@/lib/i18n";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function CartFab({
  itemCount,
  subtotalCents,
  onClick,
}: {
  itemCount: number;
  subtotalCents: number;
  onClick: () => void;
}) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {itemCount > 0 && (
        <motion.button
          type="button"
          onClick={onClick}
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-4 bottom-6 z-40 safe-bottom sm:inset-x-auto sm:right-6 sm:w-96"
        >
          <motion.div
            key={itemCount}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.045, 1] }}
            transition={{ duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }}
            className="flex items-center justify-between rounded-[var(--radius-lg)] bg-ink px-5 py-4 shadow-[var(--shadow-floating)] active:scale-[0.98] transition-transform duration-150"
          >
            <span className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-white/10">
                <ShoppingBag className="h-5 w-5 text-paper" />
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.3, opacity: 0 }}
                    transition={{ duration: 0.18, type: "spring", stiffness: 300 }}
                    className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-brand-foreground"
                  >
                    {itemCount}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="font-bold text-paper">{t("cart.title")}</span>
            </span>
            <span className="font-mono text-base font-bold text-paper">
              {formatCurrencyCents(subtotalCents)}
            </span>
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
