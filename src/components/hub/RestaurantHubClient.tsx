"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChefHat,
  LogOut,
  Plus,
  QrCode,
  Store,
  Trash2,
  Users,
  Wallet,
  Eye,
  EyeOff,
  Settings,
} from "lucide-react";
import { RestaurantMark } from "@/components/brand/RestaurantMark";
import { LogoMark } from "@/components/brand/LogoMark";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Signature } from "@/components/brand/Signature";
import { SettingsSheet } from "@/components/layout/SettingsSheet";
import { getReadableForeground } from "@/lib/utils";
import { formatCurrencyCents } from "@/lib/i18n";
import type { Restaurant, RestaurantTableInfo } from "@/types";
import type { RestaurantWaiterCommission } from "@/lib/db/repositories/commission";

export function RestaurantHubClient({
  restaurant,
  tables: initialTables,
  waiters: initialWaiters,
  currentUser,
}: {
  restaurant: Restaurant;
  tables: RestaurantTableInfo[];
  waiters: RestaurantWaiterCommission[];
  currentUser: { id: string; role: string; displayName: string };
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"mesas" | "modulos" | "garcons">("mesas");
  const [waiters, setWaiters] = useState<RestaurantWaiterCommission[]>(initialWaiters);
  const [tables, setTables] = useState<RestaurantTableInfo[]>(initialTables);
  const [savingPct, setSavingPct] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Nova mesa
  const [addingTableForm, setAddingTableForm] = useState(false);
  const [newTableLabel, setNewTableLabel] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState("4");
  const [addingTable, setAddingTable] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);

  // Novo garçom
  const [newName, setNewName] = useState("");
  const [newUser, setNewUser] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPct, setNewPct] = useState("10");
  const [showPwd, setShowPwd] = useState(false);
  const [addingWaiter, setAddingWaiter] = useState(false);
  const [waiterError, setWaiterError] = useState<string | null>(null);

  const brandStyle = useMemo(
    () => ({
      "--brand": restaurant.primaryColor,
      "--brand-foreground": getReadableForeground(restaurant.primaryColor),
      "--accent": restaurant.accentColor,
      "--accent-foreground": getReadableForeground(restaurant.accentColor),
    }) as React.CSSProperties,
    [restaurant]
  );

  async function handleLogout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
  }

  async function handleAddWaiter() {
    setWaiterError(null);
    if (!newName.trim() || !newUser.trim() || !newPwd) {
      setWaiterError("Preencha nome, usuário e senha.");
      return;
    }
    const pct = Number(newPct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setWaiterError("Percentual de comissão inválido.");
      return;
    }
    setAddingWaiter(true);
    try {
      const res = await fetch(`/api/waiter-management?restaurantId=${restaurant.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: newName.trim(),
          username: newUser.trim(),
          password: newPwd,
          commissionPct: pct,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setWaiterError(data.error ?? "Erro ao cadastrar."); return; }
      setWaiters((prev) => [
        ...prev,
        {
          waiterId: data.waiter.id,
          displayName: data.waiter.displayName,
          commissionPct: data.waiter.commissionPct,
          isActive: data.waiter.isActive,
          salesAllTimeCents: 0,
          commissionAllTimeCents: 0,
          salesPeriodCents: 0,
          commissionPeriodCents: 0,
        },
      ]);
      setNewName(""); setNewUser(""); setNewPwd(""); setNewPct("10");
    } finally {
      setAddingWaiter(false);
    }
  }

  async function handleDeleteWaiter(waiterId: string) {
    if (!confirm("Remover este garçom?")) return;
    await fetch(`/api/waiter-management/${waiterId}?restaurantId=${restaurant.id}`, { method: "DELETE" });
    setWaiters((prev) => prev.filter((w) => w.waiterId !== waiterId));
  }

  async function handleAddTable() {
    setTableError(null);
    if (!newTableLabel.trim()) {
      setTableError("Dê um nome pra mesa (ex.: Mesa 5, Varanda 1).");
      return;
    }
    const capacity = Number(newTableCapacity);
    if (!Number.isFinite(capacity) || capacity < 1 || capacity > 50) {
      setTableError("Capacidade inválida.");
      return;
    }
    setAddingTable(true);
    try {
      const res = await fetch(`/api/tables?restaurantId=${restaurant.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newTableLabel.trim(), capacity }),
      });
      const data = await res.json();
      if (!res.ok) { setTableError(data.error ?? "Erro ao criar mesa."); return; }
      setTables((prev) => [...prev, data.table]);
      setNewTableLabel(""); setNewTableCapacity("4"); setAddingTableForm(false);
    } finally {
      setAddingTable(false);
    }
  }

  async function handleDeleteTable(tableId: string) {
    if (!confirm("Remover esta mesa? O histórico de pedidos dela é mantido.")) return;
    await fetch(`/api/tables?restaurantId=${restaurant.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId }),
    });
    setTables((prev) => prev.filter((t) => t.id !== tableId));
  }

  async function handleToggleWaiter(waiter: RestaurantWaiterCommission) {
    await fetch(`/api/waiter-management/${waiter.waiterId}?restaurantId=${restaurant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !waiter.isActive }),
    });
    setWaiters((prev) => prev.map((w) => w.waiterId === waiter.waiterId ? { ...w, isActive: !w.isActive } : w));
  }

  async function handleUpdateCommissionPct(waiterId: string, pct: number) {
    setSavingPct(waiterId);
    try {
      await fetch(`/api/waiter-management/${waiterId}?restaurantId=${restaurant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionPct: pct }),
      });
      setWaiters((prev) => prev.map((w) => w.waiterId === waiterId ? { ...w, commissionPct: pct } : w));
    } finally {
      setSavingPct(null);
    }
  }

  const TABS = [
    { id: "mesas" as const, label: "Mesas", icon: QrCode },
    { id: "modulos" as const, label: "Módulos", icon: ChefHat },
    { id: "garcons" as const, label: "Garçons", icon: Users },
  ];

  const MODULES = [
    { label: "Gestão de Produtos", icon: Store, href: `/admin/${restaurant.slug}`, color: "#8B5CF6" },
    { label: "Painel da Cozinha", icon: ChefHat, href: `/cozinha/${restaurant.slug}`, color: "#E05C2A" },
    { label: "Painel do Garçom", icon: Users, href: `/garcom/${restaurant.slug}`, color: "#2563EB" },
    { label: "Painel Financeiro", icon: Wallet, href: `/financeiro/${restaurant.slug}`, color: "#1A4D3A" },
  ];

  return (
    <div style={brandStyle} className="min-h-screen bg-stone">
      {/* Header */}
      <header className="material-thin sticky top-0 z-20">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <RestaurantMark name={restaurant.name} logoIcon={restaurant.logoIcon} size="sm" />
            <div>
              <h1 className="font-display text-[1.05rem] font-bold text-ink">{restaurant.name}</h1>
              <p className="text-xs text-ink-soft">{currentUser.displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Abas */}
        <div className="flex border-t border-line/50">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-[12.5px] font-semibold transition ${
                activeTab === id
                  ? "border-b-2 text-ink"
                  : "text-ink-faint hover:text-ink-soft"
              }`}
              style={activeTab === id ? { borderColor: restaurant.primaryColor, color: restaurant.primaryColor } : {}}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-5 py-5">

        {/* Tab: Mesas */}
        {activeTab === "mesas" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-faint">
                Toque em uma mesa para abrir o cardápio do cliente
              </p>
              <button
                onClick={() => setAddingTableForm((v) => !v)}
                className="flex items-center gap-1 text-[12.5px] font-semibold"
                style={{ color: restaurant.primaryColor }}
              >
                <Plus className="h-3.5 w-3.5" />
                Mesa
              </button>
            </div>

            {addingTableForm && (
              <div className="space-y-3 rounded-[var(--radius-lg)] bg-paper p-4 shadow-[var(--shadow-card)]">
                <div className="flex gap-2">
                  <input
                    value={newTableLabel}
                    onChange={(e) => setNewTableLabel(e.target.value)}
                    placeholder="Nome (ex.: Mesa 5)"
                    className="flex-1 rounded-[var(--radius-md)] border border-line bg-stone px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                  />
                  <input
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(e.target.value.replace(/\D/g, ""))}
                    placeholder="Lugares"
                    inputMode="numeric"
                    className="w-20 rounded-[var(--radius-md)] border border-line bg-stone px-3 py-2 text-center text-sm text-ink outline-none focus:border-brand"
                  />
                </div>
                {tableError && <p className="text-xs font-medium text-danger">{tableError}</p>}
                <Button size="md" onClick={handleAddTable} disabled={addingTable} className="w-full">
                  {addingTable ? "Criando..." : "Criar mesa"}
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {tables.map((table) => (
                <div key={table.id} className="group relative">
                  <a
                    href={`/m/${restaurant.slug}/${table.qrToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] bg-paper p-5 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-lift)] active:scale-[0.97]"
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ background: `${restaurant.primaryColor}1A` }}
                    >
                      <QrCode className="h-5 w-5" style={{ color: restaurant.primaryColor }} />
                    </div>
                    <span className="text-sm font-semibold text-ink">{table.label}</span>
                    <span className="text-[11px] text-ink-faint">{table.capacity} lugares</span>
                  </a>
                  <button
                    onClick={(e) => { e.preventDefault(); handleDeleteTable(table.id); }}
                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white opacity-0 shadow-[var(--shadow-sm)] transition group-hover:opacity-100 sm:opacity-100"
                    title="Remover mesa"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {tables.length === 0 && (
              <p className="py-8 text-center text-sm text-ink-faint">Nenhuma mesa cadastrada.</p>
            )}
          </div>
        )}

        {/* Tab: Módulos */}
        {activeTab === "modulos" && (
          <div className="space-y-3">
            {MODULES.map(({ label, icon: Icon, href, color }) => (
              <a
                key={href}
                href={href}
                className="flex items-center gap-4 rounded-[var(--radius-lg)] bg-paper p-4 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-lift)] active:scale-[0.98]"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
                  style={{ background: `${color}1A` }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div>
                  <p className="font-semibold text-ink">{label}</p>
                  <p className="text-xs text-ink-soft">Requer PIN de acesso</p>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Tab: Garçons */}
        {activeTab === "garcons" && (
          <div className="space-y-4">
            {/* Lista de garçons */}
            {waiters.length > 0 && (
              <div className="overflow-hidden rounded-[var(--radius-lg)] bg-paper shadow-[var(--shadow-card)]">
                <div className="border-b border-line px-5 py-3.5">
                  <p className="text-[12px] font-bold uppercase tracking-wider text-ink-faint">
                    Garçons cadastrados
                  </p>
                </div>
                <div className="divide-y divide-line">
                  {waiters.map((waiter) => (
                    <div key={waiter.waiterId} className="space-y-2.5 px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink">{waiter.displayName}</p>
                          <p className="text-xs text-ink-faint">
                            {formatCurrencyCents(waiter.commissionPeriodCents)} de comissão (30d) ·{" "}
                            {formatCurrencyCents(waiter.commissionAllTimeCents)} acumulada
                          </p>
                        </div>
                        <Switch
                          checked={waiter.isActive}
                          onChange={() => handleToggleWaiter(waiter)}
                          label={`Ativo: ${waiter.displayName}`}
                        />
                        <button
                          onClick={() => handleDeleteWaiter(waiter.waiterId)}
                          className="ml-1 rounded-lg p-1.5 text-ink-faint transition hover:bg-danger/10 hover:text-danger"
                          title="Remover garçom"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-ink-faint">
                        Comissão
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          defaultValue={waiter.commissionPct}
                          disabled={savingPct === waiter.waiterId}
                          onBlur={(e) => {
                            const pct = Number(e.target.value);
                            if (Number.isFinite(pct) && pct >= 0 && pct <= 100 && pct !== waiter.commissionPct) {
                              handleUpdateCommissionPct(waiter.waiterId, pct);
                            }
                          }}
                          className="w-16 rounded-lg border border-line bg-stone px-2 py-1 text-center text-ink focus:border-ink/40 focus:outline-none"
                        />
                        %
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cadastrar novo garçom */}
            <div className="overflow-hidden rounded-[var(--radius-lg)] bg-paper shadow-[var(--shadow-card)]">
              <div className="border-b border-line px-5 py-3.5">
                <p className="text-[12px] font-bold uppercase tracking-wider text-ink-faint">
                  Cadastrar novo garçom
                </p>
              </div>
              <div className="space-y-3.5 p-5">
                {waiterError && (
                  <p className="rounded-[var(--radius-md)] bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">
                    {waiterError}
                  </p>
                )}
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full rounded-[var(--radius-lg)] border border-line bg-stone px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-ink/40 focus:outline-none"
                />
                <input
                  value={newUser}
                  onChange={(e) => setNewUser(e.target.value)}
                  placeholder="Usuário de login (ex: joao.silva)"
                  autoComplete="off"
                  className="w-full rounded-[var(--radius-lg)] border border-line bg-stone px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-ink/40 focus:outline-none"
                />
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="Senha inicial"
                    autoComplete="new-password"
                    className="w-full rounded-[var(--radius-lg)] border border-line bg-stone px-4 py-2.5 pr-10 text-sm text-ink placeholder:text-ink-faint focus:border-ink/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <label className="flex items-center gap-2 text-sm text-ink-soft">
                  % de comissão
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={newPct}
                    onChange={(e) => setNewPct(e.target.value)}
                    className="w-20 rounded-[var(--radius-md)] border border-line bg-stone px-3 py-1.5 text-center text-ink focus:border-ink/40 focus:outline-none"
                  />
                </label>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  loading={addingWaiter}
                  icon={<Plus className="h-4 w-4" />}
                  onClick={handleAddWaiter}
                >
                  Cadastrar garçom
                </Button>
              </div>
            </div>

            {waiters.length === 0 && !addingWaiter && (
              <p className="text-center text-sm text-ink-faint">
                Nenhum garçom cadastrado ainda.
              </p>
            )}
          </div>
        )}

        <div className="pt-4">
          <Signature />
        </div>
      </main>

      <SettingsSheet isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
