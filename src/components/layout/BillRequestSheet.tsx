"use client";

import { useState } from "react";
import { Banknote, CreditCard, QrCode, HelpCircle } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";

type PaymentPreference = "cash" | "card" | "pix" | "none";

const OPTIONS: { value: PaymentPreference; icon: typeof Banknote; labelKey: string }[] = [
  { value: "card", icon: CreditCard, labelKey: "billRequest.card" },
  { value: "pix", icon: QrCode, labelKey: "billRequest.pix" },
  { value: "cash", icon: Banknote, labelKey: "billRequest.cash" },
  { value: "none", icon: HelpCircle, labelKey: "billRequest.noPreference" },
];

export function BillRequestSheet({
  isOpen,
  onClose,
  onConfirm,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (preference: PaymentPreference) => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<PaymentPreference>("none");

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={t("billRequest.title")}
      closeLabel={t("common.close")}
      footer={
        <Button variant="primary" size="lg" fullWidth loading={loading} onClick={() => onConfirm(selected)}>
          {t("billRequest.confirmAction")}
        </Button>
      }
    >
      <p className="mb-4 text-sm text-ink-soft">{t("billRequest.subtitle")}</p>
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map(({ value, icon: Icon, labelKey }) => {
          const isSelected = selected === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setSelected(value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border px-4 py-5 transition active:scale-[0.97]",
                isSelected ? "border-ink bg-stone" : "border-line bg-paper hover:border-ink-faint"
              )}
            >
              <Icon className={cn("h-6 w-6", isSelected ? "text-ink" : "text-ink-soft")} />
              <span className="text-sm font-medium text-ink">{t(labelKey)}</span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
