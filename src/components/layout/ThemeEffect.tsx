"use client";

import { useEffect } from "react";
import { useUIStore } from "@/store/ui-store";

export function ThemeEffect() {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;

    function applyResolved(isDark: boolean) {
      root.classList.toggle("dark", isDark);
    }

    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      applyResolved(media.matches);
      const listener = (e: MediaQueryListEvent) => applyResolved(e.matches);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }

    applyResolved(theme === "dark");
  }, [theme]);

  return null;
}
