"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 50,
  size = "md",
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "md" | "sm";
}) {
  const isSm = size === "sm";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-line bg-stone",
        isSm ? "h-9" : "h-12"
      )}
    >
      <motion.button
        type="button"
        aria-label="Diminuir quantidade"
        disabled={value <= min}
        whileTap={{ scale: 0.85 }}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(
          "flex items-center justify-center rounded-full text-ink transition disabled:opacity-30",
          isSm ? "h-9 w-9" : "h-12 w-12"
        )}
      >
        <Minus className={isSm ? "h-3.5 w-3.5" : "h-4.5 w-4.5"} />
      </motion.button>
      <span
        className={cn(
          "relative overflow-hidden min-w-[1.75rem] text-center font-mono font-semibold tabular-nums text-ink",
          isSm ? "text-sm" : "text-base"
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="inline-block"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <motion.button
        type="button"
        aria-label="Aumentar quantidade"
        disabled={value >= max}
        whileTap={{ scale: 0.85 }}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cn(
          "flex items-center justify-center rounded-full text-ink transition disabled:opacity-30",
          isSm ? "h-9 w-9" : "h-12 w-12"
        )}
      >
        <Plus className={isSm ? "h-3.5 w-3.5" : "h-4.5 w-4.5"} />
      </motion.button>
    </div>
  );
}
