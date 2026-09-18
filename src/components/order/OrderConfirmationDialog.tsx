"use client";

import { motion } from "framer-motion";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { OrderProgressTrack } from "@/components/order/OrderProgressTrack";
import { formatCurrencyCents } from "@/lib/i18n";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { OrderRecord } from "@/types";

export function OrderConfirmationDialog({
  order,
  estimatedMinutes,
  onClose,
  onTrack,
}: {
  order: OrderRecord | null;
  estimatedMinutes: number;
  onClose: () => void;
  onTrack: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog isOpen={order !== null} onClose={onClose}>
      {order && (
        <div className="space-y-5">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
              <motion.path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
              />
            </svg>
          </motion.div>

          <div className="text-center">
            <h2 className="font-display text-xl font-semibold text-ink">
              {t("orderConfirmation.title")}
            </h2>
          </div>

          <div className="ticket-edge-bottom rounded-[var(--radius-lg)] bg-stone px-5 pb-6 pt-5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-2xl font-bold tracking-tight text-ink">
                {t("orderConfirmation.ticketNumber", { n: order.ticketNumber })}
              </span>
              <div className="w-28 shrink-0">
                <OrderProgressTrack status={order.status} />
              </div>
            </div>
            <div className="mt-3 space-y-1.5 border-t border-dashed border-line pt-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm text-ink-soft">
                  <span>
                    {item.quantity}× {item.nameSnapshot}
                  </span>
                  <span className="font-mono">
                    {formatCurrencyCents(item.unitPriceCents * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-ink-soft">
            {t("orderConfirmation.estimate", { min: estimatedMinutes })}
          </p>

          <div className="space-y-2">
            <Button variant="primary" size="lg" fullWidth onClick={onTrack}>
              {t("orderConfirmation.trackStatus")}
            </Button>
            <Button variant="ghost" size="md" fullWidth onClick={onClose}>
              {t("orderConfirmation.continueOrdering")}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
