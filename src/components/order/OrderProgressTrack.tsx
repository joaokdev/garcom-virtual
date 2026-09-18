"use client";

import { Fragment } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { OrderStatus } from "@/types";

const STAGES: OrderStatus[] = ["received", "preparing", "ready", "delivered"];

export function OrderProgressTrack({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  // O pulso é uma animação infinita — `MotionConfig reducedMotion="user"`
  // não desliga loops, só transições de entrada/saída, então este caso
  // continua precisando da checagem explícita.
  const prefersReducedMotion = useReducedMotion();

  if (status === "cancelled") {
    return (
      <p className="text-[12.5px] font-semibold text-danger">{t("orderStatus.cancelled")}</p>
    );
  }

  const currentIndex = STAGES.indexOf(status);
  const currentStage = STAGES[currentIndex];

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        {STAGES.map((stage, i) => {
          const reached = i <= currentIndex;
          const isActive = i === currentIndex;
          const isLast = i === STAGES.length - 1;
          return (
            <Fragment key={stage}>
              <span className="relative flex h-[7px] w-[7px] shrink-0 items-center justify-center">
                {/* Pulso sutil só no estágio atual — é o que dá a sensação de
                    "isso está acontecendo agora", sem competir com o conteúdo
                    (§12/§21). Nada disso aparece nos estágios já concluídos. */}
                {isActive && !prefersReducedMotion && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-brand"
                    animate={{ scale: [1, 2.4], opacity: [0.45, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                    aria-hidden="true"
                  />
                )}
                <motion.span
                  className={cn("h-[7px] w-[7px] rounded-full", reached ? "bg-brand" : "bg-line")}
                  initial={false}
                  animate={{ scale: isActive ? 1.15 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                />
              </span>
              {!isLast && (
                <span className="relative mx-0 h-px flex-1 overflow-hidden bg-line">
                  <motion.span
                    className="absolute inset-0 bg-brand"
                    initial={false}
                    animate={{ scaleX: i < currentIndex ? 1 : 0 }}
                    style={{ transformOrigin: "left" }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
              )}
            </Fragment>
          );
        })}
      </div>
      {/* O rótulo troca com um pequeno slide, não um corte seco — comunica
          "avançou de estágio" em vez de só "o texto mudou". */}
      <AnimatePresence mode="wait">
        <motion.p
          key={currentStage}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="text-[12.5px] font-semibold text-brand"
        >
          {currentStage ? t(`orderStatus.${currentStage}`) : null}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
