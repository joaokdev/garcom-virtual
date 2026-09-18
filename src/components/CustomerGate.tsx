"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LogoMark } from "@/components/brand/LogoMark";
import { RestaurantMark } from "@/components/brand/RestaurantMark";
import { Signature } from "@/components/brand/Signature";
import { Button } from "@/components/ui/Button";
import {
  createTableSession,
  formatCpf,
  validateCpf,
  type TableSession,
} from "@/lib/table-session";
import type { Restaurant, RestaurantTableInfo } from "@/types";

export function CustomerGate({
  restaurant,
  table,
  onEnter,
}: {
  restaurant: Restaurant;
  table: RestaurantTableInfo;
  onEnter: (session: TableSession) => void;
}) {
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [touched, setTouched] = useState(false);

  const nameError = touched && name.trim().length < 2;
  const cpfError = touched && !validateCpf(cpf);
  const canSubmit = name.trim().length >= 2 && validateCpf(cpf);

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCpf(formatCpf(e.target.value));
  }

  function handleSubmit() {
    setTouched(true);
    if (!canSubmit) return;

    const session = createTableSession(
      restaurant.id,
      table.id,
      name.trim(),
      cpf
    );
    onEnter(session);
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-stone px-6 py-12"
      style={
        {
          "--brand": restaurant.primaryColor,
          "--brand-foreground": "#FEFCFA",
          "--accent": restaurant.accentColor,
        } as React.CSSProperties
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Identidade do restaurante */}
        <div className="space-y-3 text-center">
          <div className="flex justify-center">
            <LogoMark className="h-6 w-6 text-ink-faint" />
          </div>
          <RestaurantMark
            name={restaurant.name}
            logoIcon={restaurant.logoIcon}
            size="lg"
            className="mx-auto shadow-[var(--shadow-card)]"
          />
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">
              {restaurant.name}
            </h1>
            <p className="mt-0.5 text-sm font-semibold text-brand">{table.label}</p>
          </div>
        </div>

        {/* Formulário */}
        <div className="overflow-hidden rounded-[var(--radius-card)] bg-paper shadow-[var(--shadow-card)]">
          <div className="border-b border-line px-6 py-5">
            <h2 className="font-display text-lg font-bold text-ink">
              Bem-vindo!
            </h2>
            <p className="mt-0.5 text-sm text-ink-soft">
              Informe seus dados para começar o pedido.
            </p>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="space-y-1.5">
              <label htmlFor="customer-name" className="text-sm font-semibold text-ink">
                Nome
              </label>
              <input
                id="customer-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Seu nome completo"
                autoComplete="name"
                className="w-full rounded-[var(--radius-lg)] border border-line bg-stone px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none transition-colors"
              />
              {nameError && (
                <p className="text-xs font-medium text-danger">
                  Informe seu nome.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="customer-cpf" className="text-sm font-semibold text-ink">
                CPF
              </label>
              <input
                id="customer-cpf"
                value={cpf}
                onChange={handleCpfChange}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="000.000.000-00"
                inputMode="numeric"
                autoComplete="off"
                className="w-full rounded-[var(--radius-lg)] border border-line bg-stone px-4 py-3 font-mono text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none transition-colors"
              />
              {cpfError && (
                <p className="text-xs font-medium text-danger">
                  CPF inválido. Verifique os números.
                </p>
              )}
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSubmit}
            >
              Acessar o cardápio
            </Button>
          </div>
        </div>

        <div className="space-y-2 text-center">
          <p className="text-[11px] text-ink-faint">
            Seus dados são usados apenas para identificar seu pedido nesta visita.
          </p>
          <Signature />
        </div>
      </motion.div>
    </div>
  );
}
