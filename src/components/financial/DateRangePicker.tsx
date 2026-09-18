"use client";

import { cn } from "@/lib/utils";

export type DateRangeOption = "today" | "7d" | "30d";

const OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
];

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRangeOption;
  onChange: (value: DateRangeOption) => void;
}) {
  return (
    <div className="inline-flex rounded-[var(--radius-md)] bg-stone p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-150",
            value === opt.value
              ? "bg-paper text-ink shadow-sm"
              : "text-ink-faint hover:text-ink-soft"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function resolveDateRange(option: DateRangeOption): { from: string; to: string; label: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);

  if (option === "today") {
    return { from: to, to, label: "Hoje" };
  }

  const days = option === "7d" ? 6 : 29;
  const from = new Date(today);
  from.setDate(from.getDate() - days);

  return {
    from: from.toISOString().slice(0, 10),
    to,
    label: option === "7d" ? "Últimos 7 dias" : "Últimos 30 dias",
  };
}
