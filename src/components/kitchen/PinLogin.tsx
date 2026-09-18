"use client";

import { useState } from "react";
import { Delete, ChefHat, Wallet, UtensilsCrossed, Store, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/brand/LogoMark";
import { Signature } from "@/components/brand/Signature";
import { SettingsSheet } from "@/components/layout/SettingsSheet";

type SessionType = "kitchen" | "financial" | "waiter" | "admin";

const LABELS: Record<SessionType, { title: string; subtitle: string; icon: typeof ChefHat; color: string }> = {
  kitchen: {
    title: "Acesso à Cozinha",
    subtitle: "Digite o PIN para entrar",
    icon: ChefHat,
    color: "var(--color-brand)",
  },
  waiter: {
    title: "Acesso do Garçom",
    subtitle: "Digite o PIN para entrar",
    icon: UtensilsCrossed,
    color: "var(--color-info)",
  },
  financial: {
    title: "Painel Financeiro",
    subtitle: "Digite o PIN para entrar",
    icon: Wallet,
    color: "var(--color-accent)",
  },
  admin: {
    title: "Gestão de Produtos",
    subtitle: "Digite o PIN para entrar",
    icon: Store,
    color: "var(--color-admin)",
  },
};

export function PinLogin({
  slug,
  type,
  restaurantName,
}: {
  slug: string;
  type: SessionType;
  restaurantName: string;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const label = LABELS[type];
  const MAX = 6;

  function press(digit: string) {
    if (pin.length >= MAX) return;
    setError("");
    setPin((p) => p + digit);
  }

  function del() {
    setPin((p) => p.slice(0, -1));
    setError("");
  }

  async function submit() {
    if (pin.length < 1) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, pin, type }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error ?? "PIN incorreto.");
        setPin("");
      }
    } finally {
      setLoading(false);
    }
  }

  const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
  const Icon = label.icon;

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--color-well)] px-6 py-12"
      style={{ "--brand": label.color } as React.CSSProperties}
    >
      <button
        onClick={() => setSettingsOpen(true)}
        className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-well-surface)] text-[var(--color-well-ink-faint)] active:scale-90"
        title="Configurações"
      >
        <Settings className="h-4 w-4" />
      </button>
      <div className="w-full max-w-xs space-y-8">
        {/* Header */}
        <div className="space-y-3 text-center">
          <LogoMark className="mx-auto h-8 w-8" color="var(--color-well-watermark)" />
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)]"
            style={{ background: `${label.color}1A` }}
          >
            <Icon className="h-6 w-6" style={{ color: label.color }} />
          </div>
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-well-ink-faint)]">
            {restaurantName}
          </p>
          <h1 className="font-display text-2xl font-bold text-[var(--color-well-ink)]">{label.title}</h1>
          <p className="text-sm text-[var(--color-well-ink-faint)]">{label.subtitle}</p>
        </div>

        {/* Indicadores de PIN */}
        <div className="flex items-center justify-center gap-3">
          {Array.from({ length: MAX }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-3.5 w-3.5 rounded-full border-2 transition-all duration-150",
                i < pin.length
                  ? "border-[var(--brand)] bg-[var(--brand)] scale-110"
                  : "border-[var(--color-well-border-dim)] bg-transparent"
              )}
            />
          ))}
        </div>

        {/* Erro */}
        {error && (
          <p className="text-center text-sm font-semibold text-red-400 animate-pulse">{error}</p>
        )}

        {/* Teclado numérico */}
        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((key, i) => {
            if (key === "") return <div key={i} />;
            if (key === "⌫") {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={del}
                  className="flex h-16 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-well-surface)] text-[var(--color-well-ink-soft)] transition active:scale-90 active:bg-[var(--color-well-surface-hover)]"
                >
                  <Delete className="h-5 w-5" />
                </button>
              );
            }
            return (
              <button
                key={i}
                type="button"
                onClick={() => press(key)}
                className="flex h-16 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-well-surface)] font-display text-xl font-semibold text-[var(--color-well-ink)] transition active:scale-90 active:bg-[var(--color-well-surface-hover)]"
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Botão de confirmar */}
        <button
          type="button"
          onClick={submit}
          disabled={pin.length < 1 || loading}
          className={cn(
            "w-full rounded-[var(--radius-lg)] py-4 font-bold text-[var(--color-well-ink)] transition-all duration-200",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "active:scale-[0.98]"
          )}
          style={{ background: label.color }}
        >
          {loading ? "Verificando..." : "Entrar"}
        </button>

        {process.env.NODE_ENV !== "production" && (
          <p className="text-center text-xs text-[var(--color-well-border-dim)]">
            PIN padrão (dev): <span className="font-mono text-[var(--color-well-ink-faint)]">1234</span>
          </p>
        )}

        <Signature tone="dark" />
      </div>

      <SettingsSheet isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
