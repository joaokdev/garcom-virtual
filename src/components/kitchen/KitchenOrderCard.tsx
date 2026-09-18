"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ElapsedTimer } from "@/components/ui/ElapsedTimer";
import type { KitchenOrder } from "@/lib/db/repositories/orders";

type OrderStatus = "received" | "preparing" | "ready" | "delivered";

const NEXT_STATUS: Record<string, { label: string; status: OrderStatus; color: string }> = {
  received: { label: "Iniciar preparo", status: "preparing", color: "var(--color-info)" },
  preparing: { label: "Marcar como pronto", status: "ready", color: "var(--color-success-strong)" },
  ready: { label: "Confirmar entrega", status: "delivered", color: "var(--color-well-ink-soft)" },
};

const URGENCY_THRESHOLDS = { warning: 10, danger: 20 }; // minutos

export function KitchenOrderCard({
  order,
  onAdvance,
}: {
  order: KitchenOrder;
  onAdvance: (orderId: string, status: OrderStatus) => void;
}) {
  const next = NEXT_STATUS[order.status];
  const [loading, setLoading] = useState(false);

  // Recalcula a cada 5s em vez de derivar Date.now() diretamente no render —
  // caso contrário, um pedido parado sem outros re-renders nunca troca de cor
  // de urgência (bug pré-existente encontrado na auditoria de lint).
  const [createdMinutes, setCreatedMinutes] = useState(() =>
    Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
  );

  useEffect(() => {
    const start = new Date(order.createdAt).getTime();
    const tick = () => setCreatedMinutes(Math.floor((Date.now() - start) / 60000));
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [order.createdAt]);

  const isDanger = createdMinutes >= URGENCY_THRESHOLDS.danger;
  const isWarning = createdMinutes >= URGENCY_THRESHOLDS.warning;

  async function handleAdvance() {
    if (!next || loading) return;
    setLoading(true);
    try {
      await onAdvance(order.id, next.status);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[var(--radius-lg)] border p-4 transition-all duration-300",
        "bg-[var(--color-well-surface)]",
        isDanger
          ? "border-red-500/40 shadow-[0_0_20px_rgb(239_68_68/0.15)]"
          : isWarning
            ? "border-amber-500/30"
            : "border-[var(--color-well-border)]"
      )}
    >
      {/* Cabeçalho do pedido */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xl font-black text-[var(--color-well-ink)]">
            #{order.ticketNumber}
          </span>
          <span className="rounded-full bg-[var(--color-well-border)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-well-ink-soft)]">
            {order.tableLabel}
          </span>
        </div>
        <ElapsedTimer since={order.createdAt} defaultColor="var(--color-well-ink-faint)" />
      </div>

      {/* Itens do pedido */}
      <div className="space-y-1.5 border-t border-[var(--color-well-border)] pt-2">
        {order.items.map((item, i) => (
          <div key={i} className="space-y-0.5">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-sm font-bold text-[var(--color-brand)]">{item.quantity}×</span>
              <span className="text-sm font-semibold text-[var(--color-well-ink)]">{item.name}</span>
            </div>
            {item.choices.length > 0 && (
              <p className="pl-6 text-xs text-[var(--color-well-ink-faint)]">{item.choices.join(" · ")}</p>
            )}
            {item.notes && (
              <p className="pl-6 text-xs italic text-amber-400/80">&ldquo;{item.notes}&rdquo;</p>
            )}
          </div>
        ))}
        {order.notes && (
          <p className="mt-1.5 rounded-[var(--radius-md)] bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-400">
            📝 {order.notes}
          </p>
        )}
      </div>

      {/* Botão de avanço de status */}
      {next && (
        <button
          type="button"
          onClick={handleAdvance}
          disabled={loading}
          className={cn(
            "flex w-full items-center justify-between rounded-[var(--radius-md)] px-4 py-3 text-sm font-bold text-white transition-all active:scale-[0.97]",
            "disabled:opacity-50"
          )}
          style={{ background: next.color }}
        >
          <span>{loading ? "Atualizando..." : next.label}</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
