"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChefHat, LogOut, RefreshCw, Settings } from "lucide-react";
import { KitchenOrderCard } from "@/components/kitchen/KitchenOrderCard";
import { LogoMark } from "@/components/brand/LogoMark";
import { RESTAURANT_ICONS, type RestaurantIconKey } from "@/components/brand/restaurant-icons";
import { Signature } from "@/components/brand/Signature";
import { SettingsSheet } from "@/components/layout/SettingsSheet";
import { cn } from "@/lib/utils";
import type { KitchenOrder } from "@/lib/db/repositories/orders";
import type { OrderStatus } from "@/types";
import { useIdleLogout } from "@/lib/hooks/useIdleLogout";

const COLUMNS: { status: string; label: string; color: string; dot: string }[] = [
  { status: "received",  label: "Recebidos",  color: "var(--color-brand)", dot: "bg-[var(--color-brand)]" },
  { status: "preparing", label: "Em Preparo",  color: "var(--color-info)", dot: "bg-[var(--color-info)]"  },
  { status: "ready",     label: "Prontos",     color: "var(--color-success-strong)", dot: "bg-[var(--color-success-strong)]" },
];

export function KitchenApp({ slug, restaurantName, logoIcon }: {
  slug: string;
  restaurantName: string;
  logoIcon: string | null;
}) {
  const RestaurantIcon = logoIcon ? RESTAURANT_ICONS[logoIcon as RestaurantIconKey] : undefined;
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const prevCountRef = useRef(0);
  // Um AudioContext só, reaproveitado. Antes era `new AudioContext()` a cada
  // pedido novo e nunca fechado — depois de um turno inteiro de cozinha isso
  // acumula dezenas/centenas de contexts de áudio vivos ao mesmo tempo, cada
  // um com sua própria thread, e É um candidato real pra "o app foi ficando
  // lento" ao longo do dia (não é rede/ping, é acúmulo no navegador mesmo).
  const audioCtxRef = useRef<AudioContext | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/kitchen/orders?slug=${slug}`, { cache: "no-store" });
      if (!res.ok) return;
      const { orders: fetched } = await res.json() as { orders: KitchenOrder[] };

      // Notificação sonora e visual quando chega pedido novo
      const newReceived = fetched.filter((o) => o.status === "received").length;
      if (newReceived > prevCountRef.current && prevCountRef.current >= 0) {
        try {
          if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
            audioCtxRef.current = new AudioContext();
          }
          const ctx = audioCtxRef.current;
          if (ctx.state === "suspended") await ctx.resume();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
          // Osciladores são de uso único no Web Audio API — desconectar depois
          // de tocar libera a memória do nó sem fechar o context inteiro.
          osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
          };
        } catch { /* AudioContext pode não estar disponível */ }
      }
      prevCountRef.current = newReceived;
      setOrders(fetched);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchOrders();
    const id = setInterval(fetchOrders, 5000);
    return () => {
      clearInterval(id);
      audioCtxRef.current?.close();
    };
  }, [fetchOrders]);

  async function handleAdvance(orderId: string, status: OrderStatus) {
    await fetch(`/api/kitchen/orders?slug=${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });
    await fetchOrders();
  }

  async function handleLogout() {
    await fetch(`/api/auth?slug=${slug}&type=kitchen`, { method: "DELETE" });
    window.location.reload();
  }

  // Desloga sozinho após 10 min sem interação (tablet compartilhado da equipe).
  useIdleLogout(handleLogout, 10);

  const byStatus = (status: string) => orders.filter((o) => o.status === status);
  const totalActive = orders.length;

  return (
    <div className="min-h-screen bg-[var(--color-well)] text-[var(--color-well-ink)]">
      {/* Header */}
      <header className="material-well-regular sticky top-0 z-20">
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-well-surface)]">
              {RestaurantIcon ? (
                <RestaurantIcon className="h-5 w-5 text-[var(--color-brand)]" />
              ) : (
                <LogoMark className="h-5 w-5" color="var(--color-brand)" />
              )}
            </span>
            <div>
              <h1 className="font-display text-lg font-bold text-[var(--color-well-ink)]">{restaurantName}</h1>
              <div className="flex items-center gap-2">
                <ChefHat className="h-3 w-3 text-[var(--color-brand)]" />
                <span className="text-xs font-semibold text-[var(--color-well-ink-faint)]">Painel da Cozinha</span>
                {totalActive > 0 && (
                  <span className="rounded-full bg-[var(--color-brand)]/20 px-2 py-0.5 text-[11px] font-bold text-[var(--color-brand)]">
                    {totalActive} ativo{totalActive !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[var(--color-well-border-dim)]">
              Atualizado às {lastRefresh.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <button
              onClick={fetchOrders}
              className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-well-surface)] text-[var(--color-well-ink-faint)] transition hover:text-[var(--color-well-ink)] active:scale-90"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-well-surface)] text-[var(--color-well-ink-faint)] transition hover:text-[var(--color-well-ink)] active:scale-90"
              title="Configurações"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-well-surface)] px-3 py-2 text-xs font-semibold text-[var(--color-well-ink-faint)] transition hover:text-[var(--color-well-ink)] active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Kanban */}
      <div className="grid min-h-[calc(100vh-73px)] grid-cols-3 divide-x divide-[var(--color-well-border)]">
        {COLUMNS.map((col) => {
          const colOrders = byStatus(col.status);
          return (
            <div key={col.status} className="flex flex-col">
              {/* Cabeçalho da coluna */}
              <div className="flex items-center gap-2.5 border-b border-[var(--color-well-border)] px-4 py-3.5">
                <span className={cn("h-2.5 w-2.5 rounded-full", col.dot)} />
                <span className="text-sm font-bold text-[var(--color-well-ink)]">{col.label}</span>
                <span className="ml-auto rounded-full bg-[var(--color-well-border)] px-2 py-0.5 font-mono text-xs font-bold text-[var(--color-well-ink-soft)]">
                  {colOrders.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading && colOrders.length === 0 && (
                  <div className="flex flex-col gap-2">
                    {[1, 2].map((n) => (
                      <div key={n} className="h-32 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-well-surface)]" />
                    ))}
                  </div>
                )}

                {!loading && colOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-3xl">
                      {col.status === "received" ? "🎉" : col.status === "preparing" ? "⏳" : "✅"}
                    </p>
                    <p className="mt-2 text-xs font-medium text-[var(--color-well-border-dim)]">
                      {col.status === "received"
                        ? "Nenhum pedido aguardando"
                        : col.status === "preparing"
                          ? "Nada em preparo"
                          : "Nada pronto ainda"}
                    </p>
                  </div>
                )}

                <AnimatePresence mode="popLayout">
                  {colOrders.map((order) => (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 8 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <KitchenOrderCard order={order} onAdvance={handleAdvance} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      <Signature variant="fixed" tone="dark" />

      <SettingsSheet isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
