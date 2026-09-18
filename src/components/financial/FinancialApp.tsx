"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CreditCard,
  HelpCircle,
  LogOut,
  QrCode as PixIcon,
  Receipt,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { RestaurantMark } from "@/components/brand/RestaurantMark";
import { Signature } from "@/components/brand/Signature";
import { SettingsSheet } from "@/components/layout/SettingsSheet";
import { MetricCard } from "@/components/financial/MetricCard";
import { DateRangePicker, resolveDateRange, type DateRangeOption } from "@/components/financial/DateRangePicker";
import { formatCurrencyCents } from "@/lib/i18n";
import { cn, getReadableForeground } from "@/lib/utils";
import type { FinancialOrder, FinancialSummary } from "@/lib/db/repositories/financial";
import { useIdleLogout } from "@/lib/hooks/useIdleLogout";
import { useToastStore } from "@/store/toast-store";

const PAYMENT_META: Record<string, { label: string; icon: typeof Banknote }> = {
  cash: { label: "Dinheiro", icon: Banknote },
  card: { label: "Cartão", icon: CreditCard },
  pix: { label: "Pix", icon: PixIcon },
  indefinido: { label: "Não informado", icon: HelpCircle },
};
const DEFAULT_PAYMENT_META = PAYMENT_META.indefinido!;

const STATUS_META: Record<string, { label: string; className: string }> = {
  received: { label: "Recebido", className: "bg-ink-faint/15 text-ink-soft" },
  preparing: { label: "Preparando", className: "bg-blue-500/12 text-blue-600" },
  ready: { label: "Pronto", className: "bg-green-500/12 text-green-700" },
  delivered: { label: "Entregue", className: "bg-accent/12 text-accent" },
  cancelled: { label: "Cancelado", className: "bg-danger/12 text-danger" },
};
const DEFAULT_STATUS_META = STATUS_META.received!;

export function FinancialApp({
  slug,
  restaurantName,
  primaryColor,
  accentColor,
  logoIcon,
}: {
  slug: string;
  restaurantName: string;
  primaryColor: string;
  accentColor: string;
  logoIcon: string | null;
}) {
  const [rangeOption, setRangeOption] = useState<DateRangeOption>("7d");
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [orders, setOrders] = useState<FinancialOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pushToast = useToastStore((s) => s.push);

  const brandStyle = useMemo(
    () =>
      ({
        "--brand": primaryColor,
        "--brand-foreground": getReadableForeground(primaryColor),
        "--accent": accentColor,
        "--accent-foreground": getReadableForeground(accentColor),
      }) as React.CSSProperties,
    [primaryColor, accentColor]
  );

  const range = useMemo(() => resolveDateRange(rangeOption), [rangeOption]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, ordersRes] = await Promise.all([
        fetch(`/api/financial?slug=${slug}&mode=summary&from=${range.from}&to=${range.to}`, { cache: "no-store" }),
        fetch(`/api/financial?slug=${slug}&mode=orders&from=${range.from}&to=${range.to}`, { cache: "no-store" }),
      ]);
      if (!summaryRes.ok || !ordersRes.ok) {
        throw new Error("Falha ao carregar dados financeiros.");
      }
      setSummary((await summaryRes.json()).summary);
      setOrders((await ordersRes.json()).orders);
    } finally {
      setLoading(false);
    }
  }, [slug, range]);

  useEffect(() => {
    // IIFE cancelável: evita setState depois do componente desmontar/trocar
    // de período e satisfaz a regra do linter contra setState direto no
    // corpo do efeito. Antes, uma falha de rede era engolida em silêncio —
    // agora o usuário é avisado em vez de ver os números zerados sem saber
    // se é porque não houve venda ou porque a chamada falhou.
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch {
        if (!cancelled) pushToast("Não foi possível carregar os dados financeiros.", "error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, pushToast]);

  async function handleLogout() {
    await fetch(`/api/auth?slug=${slug}&type=financial`, { method: "DELETE" });
    window.location.reload();
  }

  // Desloga sozinho após 10 min sem interação (tablet compartilhado da equipe).
  useIdleLogout(handleLogout, 10);

  const maxPaymentTotal = Math.max(1, ...(summary?.paymentBreakdown.map((p) => p.totalCents) ?? [1]));

  return (
    <div style={brandStyle} className="min-h-screen bg-stone">
      {/* Header */}
      <header className="material-thin sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <RestaurantMark name={restaurantName} logoIcon={logoIcon} size="sm" />
            <div>
              <h1 className="text-title text-ink">{restaurantName}</h1>
              <div className="flex items-center gap-1.5">
                <Wallet className="h-3 w-3 text-accent" />
                <span className="text-footnote text-ink-soft">Painel Financeiro</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DateRangePicker value={rangeOption} onChange={setRangeOption} />
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-line px-3 py-2 text-xs font-semibold text-ink-soft transition hover:text-ink active:scale-95"
              title="Configurações"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-line px-3 py-2 text-xs font-semibold text-ink-soft transition hover:text-ink active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        {/* Métricas: uma composição só, não 4 caixas repetidas (redesign §28) */}
        <div className="rounded-[var(--radius-lg)] bg-paper p-5 shadow-[var(--shadow-card)] grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 sm:divide-x sm:divide-line/70">
          <MetricCard
            icon={TrendingUp}
            label="Faturamento"
            value={formatCurrencyCents(summary?.totalRevenueCents ?? 0)}
            hint={range.label}
            tone="brand"
          />
          <MetricCard
            icon={Receipt}
            label="Pedidos"
            value={String(summary?.totalOrders ?? 0)}
            hint={range.label}
          />
          <MetricCard
            icon={Wallet}
            label="Ticket médio"
            value={formatCurrencyCents(summary?.averageTicketCents ?? 0)}
            hint="por pedido"
          />
          <MetricCard
            icon={Banknote}
            label="Taxa de serviço"
            value={formatCurrencyCents(summary?.totalServiceFeeCents ?? 0)}
            hint={summary ? `${summary.serviceFeePct}% sobre o total` : undefined}
          />
        </div>

        {/* Gráfico + formas de pagamento */}
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-[var(--radius-lg)] bg-paper p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-headline mb-4 text-ink">Receita por horário</h2>
            {summary && summary.hourlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={summary.hourlyRevenue} barCategoryGap="28%">
                  <XAxis
                    dataKey="hour"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--color-ink-faint)", fontSize: 11, fontWeight: 600 }}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--color-stone)" }}
                    contentStyle={{
                      background: "var(--color-paper)",
                      border: "1px solid var(--color-line)",
                      borderRadius: 12,
                      fontSize: 12,
                      fontFamily: "var(--font-body)",
                    }}
                    formatter={(value: number) => [formatCurrencyCents(value), "Receita"]}
                    labelFormatter={(label) => `Às ${label}`}
                  />
                  <Bar dataKey="totalCents" fill="var(--color-accent)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-ink-faint">
                {loading ? "Carregando..." : "Sem dados no período selecionado."}
              </div>
            )}
          </div>

          <div className="rounded-[var(--radius-lg)] bg-paper p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-headline mb-4 text-ink">Formas de pagamento</h2>
            <div className="space-y-4">
              {summary && summary.paymentBreakdown.length > 0 ? (
                summary.paymentBreakdown.map((p) => {
                  const meta = PAYMENT_META[p.method] ?? DEFAULT_PAYMENT_META;
                  const Icon = meta.icon;
                  const pct = Math.round((p.totalCents / maxPaymentTotal) * 100);
                  return (
                    <div key={p.method} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 font-semibold text-ink">
                          <Icon className="h-3.5 w-3.5 text-ink-soft" />
                          {meta.label}
                        </span>
                        <span className="font-mono text-xs font-bold text-ink-soft">
                          {formatCurrencyCents(p.totalCents)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-stone">
                        <div
                          className="h-full rounded-full bg-accent transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-ink-faint">
                  {loading ? "Carregando..." : "Sem pagamentos registrados."}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Lista de pedidos */}
        <div className="overflow-hidden rounded-[var(--radius-lg)] bg-paper shadow-[var(--shadow-card)]">
          <div className="border-b border-line p-5">
            <h2 className="text-headline text-ink">Pedidos do período</h2>
          </div>
          <div className="divide-y divide-line">
            {orders.length === 0 && (
              <p className="p-8 text-center text-sm text-ink-faint">
                {loading ? "Carregando pedidos..." : "Nenhum pedido no período selecionado."}
              </p>
            )}
            {orders.map((order) => {
              const status = STATUS_META[order.status] ?? DEFAULT_STATUS_META;
              const payMeta = order.paymentPreference
                ? PAYMENT_META[order.paymentPreference] ?? DEFAULT_PAYMENT_META
                : null;
              return (
                <div key={order.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="font-mono text-sm font-bold text-ink">#{order.ticketNumber}</span>
                  <span className="text-sm font-medium text-ink-soft">{order.tableLabel}</span>
                  <span className="text-xs text-ink-faint">{order.itemCount} {order.itemCount === 1 ? "item" : "itens"}</span>
                  {payMeta && (
                    <span className="hidden items-center gap-1 text-xs text-ink-faint sm:flex">
                      <payMeta.icon className="h-3 w-3" />
                      {payMeta.label}
                    </span>
                  )}
                  <span className={cn("ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold", status.className)}>
                    {status.label}
                  </span>
                  <span className="w-24 text-right font-mono text-sm font-bold text-ink">
                    {formatCurrencyCents(order.totalCents)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2">
          <Signature />
        </div>
      </div>

      <SettingsSheet isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
