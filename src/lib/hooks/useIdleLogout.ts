"use client";

import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "wheel"] as const;

/**
 * Desloga automaticamente após `minutes` sem interação — importante em
 * painéis de equipe (cozinha/garçom/financeiro/admin) rodando em tablet
 * compartilhado: se alguém sair sem apertar "sair", a sessão não fica
 * aberta indefinidamente esperando a próxima pessoa que passar pelo balcão.
 *
 * Passa `onWarning` (opcional) para avisar pouco antes de deslogar.
 */
export function useIdleLogout(onLogout: () => void, minutes = 10, onWarning?: () => void) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLogoutRef = useRef(onLogout);
  const onWarningRef = useRef(onWarning);

  // Mutar ref durante o render é proibido nas regras novas do React —
  // move para um efeito síncrono que roda antes da pintura, então o
  // valor já está atualizado quando qualquer outro efeito/handler ler.
  useEffect(() => {
    onLogoutRef.current = onLogout;
    onWarningRef.current = onWarning;
  });

  useEffect(() => {
    function reset() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);

      const totalMs = minutes * 60 * 1000;
      if (onWarningRef.current) {
        warningRef.current = setTimeout(() => onWarningRef.current?.(), Math.max(totalMs - 30_000, 0));
      }
      timeoutRef.current = setTimeout(() => onLogoutRef.current(), totalMs);
    }

    reset();
    ACTIVITY_EVENTS.forEach((evt) => document.addEventListener(evt, reset, { passive: true }));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      ACTIVITY_EVENTS.forEach((evt) => document.removeEventListener(evt, reset));
    };
  }, [minutes]);
}
