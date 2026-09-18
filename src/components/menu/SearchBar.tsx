"use client";

import { Search, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="relative px-5 sm:px-6">
      <Search className="pointer-events-none absolute left-8 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-faint" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("menu.searchPlaceholder")}
        className="w-full rounded-[var(--radius-lg)] border border-line bg-paper py-3 pl-11 pr-10 text-[14.5px] text-ink placeholder:text-ink-faint focus:border-ink/40 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("common.close")}
          className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-faint hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
