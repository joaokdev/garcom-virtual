"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * A regra CSS `prefers-reduced-motion` do globals.css só afeta animações
 * CSS — o Framer Motion anima via JavaScript e ignora ela completamente.
 * Sem isto, quem liga "reduzir movimento" no sistema continua recebendo
 * todas as transições de sheet, carrinho e status de pedido (§38).
 *
 * `reducedMotion="user"` faz o Framer respeitar a preferência do sistema
 * globalmente: animações de posição/escala são suprimidas, mas opacidade
 * continua (o conteúdo ainda aparece, só não se move).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
