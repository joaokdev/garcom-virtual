"use client";

import { Trash2 } from "lucide-react";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { computeLineTotalCents } from "@/lib/cart";
import { formatCurrencyCents } from "@/lib/i18n";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { CartLine } from "@/types";

export function CartLineRow({
  line,
  onUpdateQuantity,
  onRemove,
}: {
  line: CartLine;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-3 border-b border-line py-4 last:border-0">
      <div className="flex-1 space-y-1">
        <p className="font-medium text-ink">{line.name}</p>
        {line.selectedChoices.length > 0 && (
          <p className="text-xs text-ink-soft">
            {line.selectedChoices.map((c) => c.name).join(" · ")}
          </p>
        )}
        {line.notes && <p className="text-xs italic text-ink-faint">&ldquo;{line.notes}&rdquo;</p>}

        <div className="flex items-center gap-3 pt-1.5">
          <QuantityStepper value={line.quantity} onChange={onUpdateQuantity} size="sm" min={0} />
          <button
            type="button"
            onClick={onRemove}
            aria-label={t("cart.remove")}
            className="rounded-full p-1.5 text-ink-faint hover:bg-stone hover:text-danger transition"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <span className="font-mono text-sm font-semibold text-ink shrink-0 pt-0.5">
        {formatCurrencyCents(computeLineTotalCents(line))}
      </span>
    </div>
  );
}
