"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { useToastStore } from "@/store/toast-store";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

function ToastItem({ id, message, variant }: { id: string; message: string; variant: keyof typeof ICONS }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const Icon = ICONS[variant];

  useEffect(() => {
    const timeout = setTimeout(() => dismiss(id), 3600);
    return () => clearTimeout(timeout);
  }, [id, dismiss]);

  const tone =
    variant === "success"
      ? "text-success"
      : variant === "error"
        ? "text-danger"
        : "text-ink-soft";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="material-thick flex items-center gap-2.5 rounded-[var(--radius-lg)] px-4 py-3 max-w-sm pointer-events-auto"
      role="status"
    >
      <Icon className={`h-5 w-5 shrink-0 ${tone}`} aria-hidden="true" />
      <p className="text-callout text-ink">{message}</p>
    </motion.div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed top-0 inset-x-0 z-[100] flex flex-col items-center gap-2 p-4 pointer-events-none safe-top">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} {...toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
