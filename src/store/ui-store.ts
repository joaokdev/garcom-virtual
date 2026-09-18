import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "@/types";

export type ThemePreference = "light" | "dark" | "system";

interface UIState {
  locale: Locale;
  theme: ThemePreference;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemePreference) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      locale: "pt-BR",
      theme: "system",
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: "comanda-ui" }
  )
);
