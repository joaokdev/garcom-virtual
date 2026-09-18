"use client";

import { Sheet } from "@/components/ui/Sheet";
import { LOCALE_LABELS } from "@/lib/i18n";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useUIStore, type ThemePreference } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { SUPPORTED_LOCALES } from "@/types";
import { Sun, Moon, MonitorSmartphone } from "lucide-react";

const THEME_OPTIONS: { value: ThemePreference; icon: typeof Sun; labelKey: string }[] = [
  { value: "light", icon: Sun, labelKey: "settings.light" },
  { value: "dark", icon: Moon, labelKey: "settings.dark" },
  { value: "system", icon: MonitorSmartphone, labelKey: "settings.system" },
];

export function SettingsSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t, locale } = useTranslation();
  const setLocale = useUIStore((s) => s.setLocale);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={t("settings.title")} closeLabel={t("common.close")}>
      <div className="space-y-6 py-1">
        <div className="space-y-2.5">
          <h3 className="text-sm font-semibold text-ink">{t("settings.language")}</h3>
          <div className="grid grid-cols-1 gap-2">
            {SUPPORTED_LOCALES.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setLocale(loc)}
                className={cn(
                  "flex items-center justify-between rounded-[var(--radius-lg)] border px-4 py-3.5 text-left transition active:scale-[0.98]",
                  locale === loc ? "border-ink bg-stone" : "border-line bg-paper"
                )}
              >
                <span className="text-sm font-medium text-ink">{LOCALE_LABELS[loc]}</span>
                {locale === loc && <span className="h-2 w-2 rounded-full bg-ink" />}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <h3 className="text-sm font-semibold text-ink">{t("settings.theme")}</h3>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map(({ value, icon: Icon, labelKey }) => {
              const isSelected = theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-[var(--radius-lg)] border px-3 py-3.5 transition active:scale-[0.97]",
                    isSelected ? "border-ink bg-stone" : "border-line bg-paper"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isSelected ? "text-ink" : "text-ink-soft")} />
                  <span className="text-xs font-medium text-ink">{t(labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
