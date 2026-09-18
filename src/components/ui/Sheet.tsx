"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "auto" | "tall";
  closeLabel?: string;
}

export function Sheet({ isOpen, onClose, title, children, footer, size = "auto", closeLabel = "Fechar" }: SheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 700) onClose();
            }}
            className={cn(
              // Sheet é camada 3 (funcional/flutuante): usa material, não superfície
              // sólida. O footer e o header NÃO recebem material próprio — dois
              // vidros empilhados colapsam a legibilidade (ver AUDIT.md).
              "material-thick relative z-10 flex w-full flex-col",
              "rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)] sm:max-w-lg sm:mb-4",
              size === "tall" ? "max-h-[88vh]" : "max-h-[85vh]"
            )}
          >
            {/* Alça de arrastar: só essa faixa inicia o gesto de "arraste pra fechar" —
                assim o conteúdo rolável abaixo continua rolando normalmente com o dedo. */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex items-center justify-center pt-3 pb-1 shrink-0 cursor-grab touch-none active:cursor-grabbing"
            >
              <div className="h-1.5 w-10 rounded-full bg-line" />
            </div>

            {title && (
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="flex items-center justify-between px-6 pt-2 pb-2 shrink-0 touch-none"
              >
                <h2 className="text-title text-ink">{title}</h2>
                <button
                  onClick={onClose}
                  aria-label={closeLabel}
                  className="rounded-full p-2 text-ink-soft hover:bg-stone active:scale-90 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="overflow-y-auto px-6 pb-4 grow overscroll-contain">{children}</div>

            {footer && (
              <div className="shrink-0 border-t border-line/70 px-6 py-4 safe-bottom rounded-b-[var(--radius-xl)]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
