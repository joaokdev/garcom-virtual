"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Settings } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/Button";
import { Signature } from "@/components/brand/Signature";
import { SettingsSheet } from "@/components/layout/SettingsSheet";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!username.trim() || !password) {
      setError("Preencha usuário e senha.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao fazer login.");
        return;
      }

      if (data.role === "superadmin") {
        router.push("/admin/dashboard");
      } else {
        // Manager e waiter: redireciona para o hub do restaurante
        router.push(`/r/${data.restaurantId}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-stone px-6 py-12">
      <button
        onClick={() => setSettingsOpen(true)}
        className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-line bg-paper text-ink-faint transition hover:text-ink active:scale-90"
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
        <div className="space-y-2 text-center">
          <Wordmark className="justify-center" iconClassName="h-8 w-8" textClassName="text-2xl" />
          <p className="text-sm text-ink-soft">Plataforma de gestão de restaurantes</p>
        </div>

        <div className="overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-[var(--shadow-lift)]">
          <div className="border-b border-line px-6 py-5">
            <h1 className="font-display text-lg font-bold text-ink">Entrar</h1>
          </div>

          <div className="space-y-4 px-6 py-5">
            {error && (
              <div className="rounded-[var(--radius-md)] bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-ink">Usuário</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="seu.usuario"
                autoComplete="username"
                className="w-full rounded-[var(--radius-lg)] border border-line bg-stone px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-ink/40 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-ink">Senha</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-[var(--radius-lg)] border border-line bg-stone px-4 py-3 pr-11 text-sm text-ink placeholder:text-ink-faint focus:border-ink/40 focus:outline-none"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                >
                  {showPwd
                    ? <EyeOff className="h-4.5 w-4.5" />
                    : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <Button variant="primary" size="lg" fullWidth loading={loading} onClick={handleSubmit}>
              Entrar
            </Button>
          </div>
        </div>

        <Signature />
      </motion.div>

      <SettingsSheet isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
