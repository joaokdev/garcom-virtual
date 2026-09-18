"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/brand/LogoMark";
import { RESTAURANT_ICONS, type RestaurantIconKey } from "@/components/brand/restaurant-icons";
import { Signature } from "@/components/brand/Signature";
import { getReadableForeground } from "@/lib/utils";
import { SettingsSheet } from "@/components/layout/SettingsSheet";

export function WaiterLoginPage({
  restaurantName,
  restaurantSlug,
  primaryColor,
  logoIcon,
}: {
  restaurantName: string;
  restaurantSlug: string;
  primaryColor: string;
  logoIcon: string | null;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const Icon = logoIcon ? RESTAURANT_ICONS[logoIcon as RestaurantIconKey] : undefined;
  const fgColor = getReadableForeground(primaryColor);

  async function handleLogin() {
    setError(null);
    if (!username.trim() || !password) { setError("Preencha usuário e senha."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Credenciais incorretas."); return; }
      // Recarrega a página — o Server Component detectará a sessão e renderizará o WaiterApp
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--color-well)] px-6 py-12">
      <button
        onClick={() => setSettingsOpen(true)}
        className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-well-surface)] text-[var(--color-well-ink-faint)] active:scale-90"
        title="Configurações"
      >
        <Settings className="h-4 w-4" />
      </button>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Marca do restaurante */}
        <div className="space-y-3 text-center">
          <LogoMark className="mx-auto h-6 w-6" color="var(--color-well-watermark)" />
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)]"
            style={{ background: `${primaryColor}25` }}
          >
            {Icon
              ? <Icon className="h-7 w-7" style={{ color: primaryColor }} />
              : <span className="font-display text-2xl font-bold" style={{ color: primaryColor }}>
                  {restaurantName.charAt(0)}
                </span>
            }
          </div>
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-well-ink-faint)]">
            {restaurantName}
          </p>
          <h1 className="font-display text-2xl font-bold text-[var(--color-well-ink)]">Acesso do Garçom</h1>
        </div>

        {/* Formulário */}
        <div className="space-y-3">
          {error && (
            <div className="rounded-[var(--radius-lg)] bg-red-500/15 px-4 py-3 text-sm font-medium text-red-400">
              {error}
            </div>
          )}

          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Usuário"
            autoComplete="username"
            className="w-full rounded-[var(--radius-lg)] border border-[var(--color-well-border)] bg-[var(--color-well-surface)] px-4 py-3.5 text-sm text-[var(--color-well-ink)] placeholder:text-[var(--color-well-ink-subtle)] focus:border-[var(--color-well-ink-subtle)] focus:outline-none"
          />

          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Senha"
              autoComplete="current-password"
              className="w-full rounded-[var(--radius-lg)] border border-[var(--color-well-border)] bg-[var(--color-well-surface)] px-4 py-3.5 pr-11 text-sm text-[var(--color-well-ink)] placeholder:text-[var(--color-well-ink-subtle)] focus:border-[var(--color-well-ink-subtle)] focus:outline-none"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-well-ink-subtle)] hover:text-[var(--color-well-ink-soft)]"
            >
              {showPwd ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-[var(--radius-lg)] py-4 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ background: primaryColor, color: fgColor }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>

        <Signature tone="dark" />
      </motion.div>

      <SettingsSheet isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
