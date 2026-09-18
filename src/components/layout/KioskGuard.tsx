"use client";

import { useEffect } from "react";

/**
 * Camada de dissuasão para uso em tablet dedicado do estabelecimento.
 *
 * IMPORTANTE — isso NÃO é uma trava de segurança de verdade: qualquer coisa
 * em JavaScript rodando no navegador pode ser contornada por quem tem acesso
 * físico ao aparelho (o "Inspecionar elemento" sempre pode ser reaberto por
 * outros meios). O que protege de verdade contra alguém "sair do app" no
 * tablet é a configuração do PRÓPRIO APARELHO:
 *   - Android: Modo de fixação de tela (Screen Pinning) ou "modo dedicado a
 *     um app" via MDM (Android Enterprise / Google Family Link), ou um
 *     navegador-quiosque como o "Fully Kiosk Browser".
 *   - iPad: Acesso Guiado (Guided Access), em Ajustes > Acessibilidade.
 * Isso aqui é só a segunda camada, para reduzir o "tropeço" comum de alguém
 * apertar com o dedo sem querer, arrastar pra revelar a barra do navegador,
 * ou dar um toque longo numa imagem — não para barrar um invasor decidido.
 * A segurança de verdade da aplicação continua sendo 100% no servidor.
 */
export function KioskGuard() {
  useEffect(() => {
    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
    }

    function onKeyDown(e: KeyboardEvent) {
      // e.key pode vir undefined em alguns cenários (autofill do navegador,
      // extensões, IME/teclados virtuais que disparam keydown sintético) —
      // sem essa guarda, isso derruba o listener com TypeError (bug real
      // encontrado em produção: "Cannot read properties of undefined").
      const key = e.key?.toLowerCase() ?? "";
      if (!key) return;
      const blockDevtools =
        key === "f12" ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) ||
        (e.metaKey && e.altKey && ["i", "j", "c"].includes(key)) || // macOS
        (e.ctrlKey && key === "u"); // ver código-fonte
      if (blockDevtools) e.preventDefault();
    }

    // Evita o gesto de "puxar pra baixo pra atualizar" comum em tablets,
    // que no navegador solto costuma revelar a barra de endereço.
    let touchStartY = 0;
    function onTouchStart(e: TouchEvent) {
      touchStartY = e.touches[0]?.clientY ?? 0;
    }
    function onTouchMove(e: TouchEvent) {
      const currentY = e.touches[0]?.clientY ?? 0;
      const scrolledToTop = window.scrollY <= 0;
      const pullingDown = currentY - touchStartY > 0;
      if (scrolledToTop && pullingDown) e.preventDefault();
    }

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return null;
}
