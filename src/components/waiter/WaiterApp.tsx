"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Check,
  LogOut,
  Package,
  Receipt,
  Banknote,
  CreditCard,
  QrCode as PixIcon,
  HelpCircle,
  Wallet,
  LayoutGrid,
  Settings,
} from "lucide-react";
import { LogoMark } from "@/components/brand/LogoMark";
import { RESTAURANT_ICONS, type RestaurantIconKey } from "@/components/brand/restaurant-icons";
import { Signature } from "@/components/brand/Signature";
import { ElapsedTimer } from "@/components/ui/ElapsedTimer";
import { formatCurrencyCents } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { KitchenOrder } from "@/lib/db/repositories/orders";
import { useIdleLogout } from "@/lib/hooks/useIdleLogout";
import type { WaiterCallWithTable } from "@/lib/db/repositories/waiterCalls";
import type { BillRequestWithTable } from "@/lib/db/repositories/billRequests";
import type { WaiterCommissionSummary } from "@/lib/db/repositories/commission";
import { SettingsSheet } from "@/components/layout/SettingsSheet";

type Tab = "deliveries" | "calls" | "bills" | "tables" | "commission";

const PAYMENT_META: Record<string, { label: string; icon: typeof Banknote }> = {
  cash: { label: "Dinheiro", icon: Banknote },
  card: { label: "Cartão", icon: CreditCard },
  pix: { label: "Pix", icon: PixIcon },
};

function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.setValueAtTime(990, ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch { /* AudioContext indisponível */ }
}

export function WaiterApp({
  slug,
  restaurantName,
  logoIcon,
  currentUser,
}: {
  slug: string;
  restaurantName: string;
  logoIcon: string | null;
  currentUser: { role: "superadmin" | "manager" | "waiter"; displayName: string };
}) {
  const RestaurantIcon = logoIcon ? RESTAURANT_ICONS[logoIcon as RestaurantIconKey] : undefined;
  const [tab, setTab] = useState<Tab>("deliveries");
  const [readyOrders, setReadyOrders] = useState<KitchenOrder[]>([]);
  const [calls, setCalls] = useState<WaiterCallWithTable[]>([]);
  const [bills, setBills] = useState<BillRequestWithTable[]>([]);
  const [loading, setLoading] = useState(true);
  const isWaiter = currentUser.role === "waiter";
  const [myTables, setMyTables] = useState<{ id: string; label: string; assumedByMe: boolean; assumedByOther: boolean }[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [commission, setCommission] = useState<WaiterCommissionSummary | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const prevPendingRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/waiter/dashboard?slug=${slug}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as {
        readyOrders: KitchenOrder[];
        waiterCalls: WaiterCallWithTable[];
        billRequests: BillRequestWithTable[];
      };
      const pendingTotal = data.readyOrders.length + data.waiterCalls.length + data.billRequests.length;
      if (pendingTotal > prevPendingRef.current) playChime();
      prevPendingRef.current = pendingTotal;

      setReadyOrders(data.readyOrders);
      setCalls(data.waiterCalls);
      setBills(data.billRequests);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const loadTables = useCallback(async () => {
    setTablesLoading(true);
    try {
      const res = await fetch(`/api/waiter/tables?slug=${slug}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as { tables: typeof myTables };
      setMyTables(data.tables);
    } finally {
      setTablesLoading(false);
    }
  }, [slug]);

  const loadCommission = useCallback(async () => {
    if (!isWaiter) return;
    const res = await fetch(`/api/waiter/commission?slug=${slug}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json() as { summary: WaiterCommissionSummary };
    setCommission(data.summary);
  }, [slug, isWaiter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      if (tab === "tables") {
        await loadTables();
      } else if (tab === "commission") {
        await loadCommission();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, loadTables, loadCommission]);

  async function toggleTable(tableId: string, currentlyMine: boolean) {
    setMyTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, assumedByMe: !currentlyMine } : t))
    );
    await fetch(`/api/waiter/tables?slug=${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId, action: currentlyMine ? "release" : "assume" }),
    });
    loadTables();
  }

  async function deliverOrder(orderId: string) {
    setReadyOrders((prev) => prev.filter((o) => o.id !== orderId));
    await fetch(`/api/waiter/orders?slug=${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
  }

  async function resolveCall(callId: string) {
    setCalls((prev) => prev.filter((c) => c.id !== callId));
    await fetch(`/api/waiter/calls?slug=${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId }),
    });
  }

  async function closeBill(requestId: string, tableId: string) {
    setBills((prev) => prev.filter((b) => b.id !== requestId));
    // Fecha a conta via API de bills
    await fetch(`/api/waiter/bills?slug=${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    // Sinaliza liberação da mesa (o cliente precisará se identificar novamente)
    await fetch(`/api/waiter/table-reset?slug=${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId }),
    });
  }

  async function handleLogout() {
    await fetch(`/api/auth/login`, { method: "DELETE" });
    window.location.reload();
  }

  // Desloga sozinho após 10 min sem interação (tablet compartilhado da equipe).
  useIdleLogout(handleLogout, 10);

  const TABS: { id: Tab; label: string; icon: typeof Package; count: number }[] = [
    { id: "deliveries", label: "Entregas", icon: Package, count: readyOrders.length },
    { id: "calls", label: "Chamados", icon: Bell, count: calls.length },
    { id: "bills", label: "Contas", icon: Receipt, count: bills.length },
    { id: "tables", label: "Mesas", icon: LayoutGrid, count: 0 },
    ...(isWaiter ? [{ id: "commission" as Tab, label: "Comissão", icon: Wallet, count: 0 }] : []),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-well)] text-[var(--color-well-ink)]">
      {/* Header */}
      <header className="material-well-thin safe-top sticky top-0 z-20 flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-well-surface)]">
            {RestaurantIcon ? (
              <RestaurantIcon className="h-4.5 w-4.5 text-[var(--color-info)]" />
            ) : (
              <LogoMark className="h-4.5 w-4.5" color="var(--color-info)" />
            )}
          </span>
          <div>
            <h1 className="text-[15px] font-bold leading-tight text-[var(--color-well-ink)]">{restaurantName}</h1>
            <p className="text-[11px] font-semibold text-[var(--color-well-ink-faint)]">Painel do Garçom</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-well-surface)] text-[var(--color-well-ink-faint)] active:scale-90"
            title="Configurações"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-well-surface)] text-[var(--color-well-ink-faint)] active:scale-90"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <SettingsSheet isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Conteúdo */}
      <main className="flex-1 space-y-3 overflow-y-auto px-4 pb-28 pt-4">
        {tab === "deliveries" && (
          <>
            {!loading && readyOrders.length === 0 && (
              <EmptyTab emoji="📦" text="Nenhum pedido pronto para entrega" />
            )}
            <AnimatePresence mode="popLayout">
              {readyOrders.map((order) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 80 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-[var(--radius-lg)] border border-[var(--color-well-border)] bg-[var(--color-well-surface)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-black">#{order.ticketNumber}</span>
                      <span className="rounded-full bg-[var(--color-well-border)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-well-ink-soft)]">
                        {order.tableLabel}
                      </span>
                    </div>
                    <ElapsedTimer since={order.createdAt} defaultColor="var(--color-well-ink-faint)" />
                  </div>
                  <ul className="mt-2.5 space-y-1 border-t border-[var(--color-well-border)] pt-2.5">
                    {order.items.map((item, i) => (
                      <li key={i} className="text-sm text-[var(--color-well-ink-soft)]">
                        <span className="font-mono font-bold text-[var(--color-info)]">{item.quantity}×</span>{" "}
                        {item.name}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => deliverOrder(order.id)}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-success-strong)] py-3 text-sm font-bold text-white active:scale-[0.97]"
                  >
                    <Check className="h-4 w-4" />
                    Confirmar entrega
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}

        {tab === "calls" && (
          <>
            {!loading && calls.length === 0 && (
              <EmptyTab emoji="🔔" text="Nenhum chamado pendente" />
            )}
            <AnimatePresence mode="popLayout">
              {calls.map((call) => (
                <motion.div
                  key={call.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 80 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-amber-500/25 bg-[var(--color-well-surface)] p-4"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
                    <Bell className="h-5 w-5 text-amber-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[var(--color-well-ink)]">{call.tableLabel}</p>
                    <ElapsedTimer since={call.createdAt} defaultColor="var(--color-well-ink-faint)" />
                  </div>
                  <button
                    onClick={() => resolveCall(call.id)}
                    className="shrink-0 rounded-[var(--radius-md)] bg-[var(--color-well-border)] px-4 py-2.5 text-sm font-bold text-[var(--color-well-ink)] active:scale-95"
                  >
                    Atendido
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}

        {tab === "bills" && (
          <>
            {!loading && bills.length === 0 && (
              <EmptyTab emoji="🧾" text="Nenhuma conta solicitada" />
            )}
            <AnimatePresence mode="popLayout">
              {bills.map((bill) => {
                const payMeta = bill.paymentPreference ? PAYMENT_META[bill.paymentPreference] : null;
                const PayIcon = payMeta?.icon ?? HelpCircle;
                return (
                  <motion.div
                    key={bill.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 80 }}
                    transition={{ duration: 0.25 }}
                    className="rounded-[var(--radius-lg)] border border-[var(--color-well-border)] bg-[var(--color-well-surface)] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-[var(--color-well-ink)]">{bill.tableLabel}</p>
                      <ElapsedTimer since={bill.createdAt} defaultColor="var(--color-well-ink-faint)" />
                    </div>
                    <div className="mt-2 flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--color-well-border)] px-3.5 py-2.5">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-well-ink-soft)]">
                        <PayIcon className="h-3.5 w-3.5" />
                        {payMeta?.label ?? "Forma não informada"}
                      </span>
                      <span className="font-mono text-sm font-bold text-[var(--color-well-ink)]">
                        {formatCurrencyCents(bill.totalCents)}
                      </span>
                    </div>
                    <button
                      onClick={() => closeBill(bill.id, bill.tableId)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent py-3 text-sm font-bold text-accent-foreground active:scale-[0.97]"
                    >
                      <Check className="h-4 w-4" />
                      Fechar conta
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </>
        )}
        {tab === "tables" && (
          <>
            {!tablesLoading && myTables.length === 0 && (
              <EmptyTab emoji="🍽️" text="Nenhuma mesa cadastrada" />
            )}
            {isWaiter && (
              <p className="mb-1 text-xs font-medium text-[var(--color-well-ink-faint)]">
                Assuma uma mesa para que os pedidos feitos nela contem para sua comissão.
              </p>
            )}
            <div className="grid grid-cols-3 gap-2.5">
              {myTables.map((t) => (
                <button
                  key={t.id}
                  disabled={!isWaiter || t.assumedByOther}
                  onClick={() => isWaiter && toggleTable(t.id, t.assumedByMe)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-[var(--radius-lg)] border p-3.5 text-sm font-bold transition-colors disabled:opacity-50",
                    t.assumedByMe
                      ? "border-[var(--color-info)] bg-[var(--color-info)]/10 text-[var(--color-info)]"
                      : "border-[var(--color-well-border)] bg-[var(--color-well-surface)] text-[var(--color-well-ink)]"
                  )}
                >
                  {t.label}
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-well-ink-faint)]">
                    {t.assumedByMe ? "Assumida" : t.assumedByOther ? "Outro garçom" : "Livre"}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {tab === "commission" && isWaiter && (
          <>
            {!commission && (
              <div className="py-20 text-center text-sm text-[var(--color-well-ink-faint)]">Carregando…</div>
            )}
            {commission && (
              <>
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-well-border)] bg-[var(--color-well-surface)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-well-ink-faint)]">
                    {currentUser.displayName} · {commission.commissionPct}% de comissão
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="font-mono text-lg font-black text-[var(--color-well-ink)]">
                        {formatCurrencyCents(commission.commissionTodayCents)}
                      </p>
                      <p className="text-[11px] text-[var(--color-well-ink-faint)]">Hoje</p>
                    </div>
                    <div>
                      <p className="font-mono text-lg font-black text-[var(--color-well-ink)]">
                        {formatCurrencyCents(commission.commissionPeriodCents)}
                      </p>
                      <p className="text-[11px] text-[var(--color-well-ink-faint)]">Período (30d)</p>
                    </div>
                    <div>
                      <p className="font-mono text-lg font-black text-[var(--color-well-ink)]">
                        {formatCurrencyCents(commission.commissionAllTimeCents)}
                      </p>
                      <p className="text-[11px] text-[var(--color-well-ink-faint)]">Acumulada</p>
                    </div>
                  </div>
                </div>

                <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-well-ink-faint)]">
                  Histórico diário
                </p>
                {commission.history.length === 0 && (
                  <EmptyTab emoji="📊" text="Nenhuma venda registrada ainda" />
                )}
                {commission.history.map((h) => (
                  <div
                    key={h.date}
                    className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-well-border)] bg-[var(--color-well-surface)] px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-[var(--color-well-ink)]">
                      {new Date(h.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </span>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-[var(--color-well-ink)]">
                        {formatCurrencyCents(h.commissionCents)}
                      </p>
                      <p className="text-[11px] text-[var(--color-well-ink-faint)]">
                        vendas: {formatCurrencyCents(h.salesCents)}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-[64px] z-10 pb-2 text-center">
        <Signature tone="dark" />
      </div>

      {/* Tab bar inferior */}
      <nav className="material-well-regular safe-bottom fixed inset-x-0 bottom-0 z-20">
        <div className="flex">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-1 py-3 transition-colors",
                  isActive ? "text-[var(--color-well-ink)]" : "text-[var(--color-well-ink-faint)]"
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {t.count > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-bold text-white">
                      {t.count}
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-semibold">{t.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="waiter-tab-indicator"
                    className="absolute top-0 h-0.5 w-10 rounded-full bg-[var(--color-info)]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function EmptyTab({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
      <p className="text-4xl">{emoji}</p>
      <p className="text-sm font-medium text-[var(--color-well-border-dim)]">{text}</p>
    </div>
  );
}
