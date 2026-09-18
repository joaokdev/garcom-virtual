"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CartLineRow } from "@/components/cart/CartLineRow";
import { Receipt } from "lucide-react";
import { computeCartSubtotalCents } from "@/lib/cart";
import { formatCurrencyCents } from "@/lib/i18n";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { CartLine } from "@/types";

export function CartSheet({
  isOpen,
  onClose,
  lines,
  serviceFeePct,
  onUpdateQuantity,
  onRemove,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  lines: CartLine[];
  serviceFeePct: number;
  onUpdateQuantity: (cartLineId: string, quantity: number) => void;
  onRemove: (cartLineId: string) => void;
  onSubmit: (notes: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [orderNotes, setOrderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const subtotal = computeCartSubtotalCents(lines);
  const serviceFee = Math.round(subtotal * (serviceFeePct / 100));
  const total = subtotal + serviceFee;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSubmit(orderNotes.trim());
      setOrderNotes("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={t("cart.title")}
      closeLabel={t("common.close")}
      size="tall"
      footer={
        lines.length > 0 ? (
          <div className="space-y-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-ink-soft">
                <span>{t("cart.subtotal")}</span>
                <span className="font-mono">{formatCurrencyCents(subtotal)}</span>
              </div>
              {serviceFeePct > 0 && (
                <div className="flex justify-between text-ink-soft">
                  <span>{t("cart.serviceFee", { pct: serviceFeePct })}</span>
                  <span className="font-mono">{formatCurrencyCents(serviceFee)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 text-base font-semibold text-ink">
                <span>{t("cart.total")}</span>
                {/* O total rola verticalmente quando muda — o usuário vê o
                    valor reagir à ação dele, em vez de trocar sem aviso (§15). */}
                <span className="relative overflow-hidden font-mono tabular-nums">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={total}
                      initial={{ y: "70%", opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: "-70%", opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      className="block"
                    >
                      {formatCurrencyCents(total)}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </div>
            </div>
            <Button variant="primary" size="lg" fullWidth loading={submitting} onClick={handleSubmit}>
              {submitting ? t("cart.sending") : t("cart.sendOrder")}
            </Button>
          </div>
        ) : undefined
      }
    >
      {lines.length === 0 ? (
        <EmptyState
          icon={<Receipt className="h-10 w-10" strokeWidth={1.5} />}
          title={t("cart.empty")}
          description={t("cart.emptyHint")}
        />
      ) : (
        <div className="space-y-1">
          <div>
            <AnimatePresence initial={false} mode="popLayout">
              {lines.map((line) => (
                <motion.div
                  key={line.cartLineId}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  // Sai encolhendo pra esquerda: comunica "foi removido",
                  // não "a lista piscou" (§15 — motion com propósito).
                  exit={{ opacity: 0, height: 0, x: -24 }}
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  style={{ overflow: "hidden" }}
                >
                  <CartLineRow
                    line={line}
                    onUpdateQuantity={(q) => onUpdateQuantity(line.cartLineId, q)}
                    onRemove={() => onRemove(line.cartLineId)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="space-y-2 pt-3">
            <label htmlFor="order-notes" className="text-sm font-semibold text-ink">
              {t("cart.orderNotesLabel")}
            </label>
            <textarea
              id="order-notes"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full resize-none rounded-[var(--radius-lg)] border border-line bg-paper px-4 py-3 text-sm text-ink focus:border-ink"
            />
          </div>
        </div>
      )}
    </Sheet>
  );
}
