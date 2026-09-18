"use client";

import { useUIStore } from "@/store/ui-store";
import { translate, pickI18nText } from "@/lib/i18n";
import type { I18nText } from "@/types";

export function useTranslation() {
  const locale = useUIStore((s) => s.locale);

  return {
    locale,
    t: (key: string, params?: Record<string, string | number>) =>
      translate(locale, key, params),
    text: (i18nText: I18nText) => pickI18nText(i18nText, locale),
  };
}
