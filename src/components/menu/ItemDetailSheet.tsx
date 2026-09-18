"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { MenuItemImage } from "@/components/menu/MenuItemImage";
import { formatCurrencyCents } from "@/lib/i18n";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";
import type { CartLine, MenuItem, SelectedChoice } from "@/types";

export function ItemDetailSheet({
  item,
  onClose,
  onAdd,
}: {
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (line: Omit<CartLine, "cartLineId">) => void;
}) {
  const { t, text } = useTranslation();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  const isOpen = item !== null;

  const resetState = () => {
    setQuantity(1);
    setNotes("");
    setSelections({});
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetState, 250);
  };

  function toggleChoice(groupId: string, choiceId: string, type: "single" | "multiple", maxSelect: number) {
    setSelections((prev) => {
      const current = prev[groupId] ?? [];
      if (type === "single") {
        return { ...prev, [groupId]: current[0] === choiceId ? [] : [choiceId] };
      }
      const isSelected = current.includes(choiceId);
      if (isSelected) {
        return { ...prev, [groupId]: current.filter((id) => id !== choiceId) };
      }
      if (current.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...current, choiceId] };
    });
  }

  const selectedChoices: SelectedChoice[] = useMemo(() => {
    if (!item) return [];
    const result: SelectedChoice[] = [];
    for (const group of item.optionGroups) {
      const chosenIds = selections[group.id] ?? [];
      for (const choiceId of chosenIds) {
        const choice = group.choices.find((c) => c.id === choiceId);
        if (choice) {
          result.push({
            groupId: group.id,
            choiceId: choice.id,
            name: text(choice.name),
            priceDeltaCents: choice.priceDeltaCents,
          });
        }
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, selections]);

  const unitTotalCents =
    (item?.priceCents ?? 0) + selectedChoices.reduce((sum, c) => sum + c.priceDeltaCents, 0);
  const lineTotalCents = unitTotalCents * quantity;

  const missingRequiredGroup = item?.optionGroups.find(
    (g) => g.isRequired && (selections[g.id]?.length ?? 0) < g.minSelect
  );
  const canAdd = !missingRequiredGroup;

  function handleAdd() {
    if (!item || !canAdd) return;
    onAdd({
      menuItemId: item.id,
      name: text(item.name),
      unitBasePriceCents: item.priceCents,
      prepTimeMinutes: item.prepTimeMinutes,
      quantity,
      selectedChoices,
      notes: notes.trim(),
    });
    handleClose();
  }

  return (
    <Sheet
      isOpen={isOpen}
      onClose={handleClose}
      size="tall"
      closeLabel={t("common.close")}
      footer={
        item && (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!canAdd}
            onClick={handleAdd}
          >
            {t("itemDetail.addForPrice", { price: formatCurrencyCents(lineTotalCents) })}
          </Button>
        )
      }
    >
      {item && (
        <div className="space-y-6">
          <MenuItemImage
            src={item.imageUrl}
            alt={text(item.name)}
            className="-mx-6 -mt-1 h-52 w-[calc(100%+3rem)] sm:rounded-[var(--radius-lg)] sm:mx-0 sm:w-full"
            sizes="(max-width: 640px) 100vw, 480px"
          />

          <div className="space-y-2">
            <h2 className="font-display text-[1.5rem] font-bold leading-tight text-ink">{text(item.name)}</h2>

            <div className="flex flex-wrap items-center gap-x-1.5 text-[12.5px] font-medium text-ink-faint">
              {item.isChefRecommendation && <span className="text-brand">{t("menu.chefRecommendation")}</span>}
              {item.isChefRecommendation && <span>·</span>}
              <span>
                {[t("itemDetail.prepTime", { min: item.prepTimeMinutes }), ...item.tags].join(" · ")}
              </span>
            </div>

            <p className="text-[15px] leading-relaxed text-ink-soft">{text(item.description)}</p>
            <p className="pt-1 font-mono text-xl font-bold text-ink">
              {formatCurrencyCents(item.priceCents)}
            </p>
          </div>

          {item.optionGroups.map((group) => (
            <div key={group.id} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-ink">{text(group.name)}</h3>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    group.isRequired ? "text-accent" : "text-ink-faint"
                  )}
                >
                  {group.isRequired
                    ? t("itemDetail.required")
                    : t("itemDetail.optional")}
                </span>
              </div>
              {group.type === "multiple" && (
                <p className="text-xs text-ink-faint">
                  {t("itemDetail.chooseUpTo", { n: group.maxSelect })}
                </p>
              )}

              <div className="space-y-2">
                {group.choices.map((choice) => {
                  const isSelected = (selections[group.id] ?? []).includes(choice.id);
                  return (
                    <motion.button
                      key={choice.id}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() =>
                        toggleChoice(group.id, choice.id, group.type, group.maxSelect)
                      }
                      className={cn(
                        "flex w-full items-center justify-between rounded-[var(--radius-lg)] border px-4 py-3.5 text-left transition-colors duration-150",
                        isSelected
                          ? "border-brand bg-brand/[0.06]"
                          : "border-line bg-paper hover:border-ink-faint"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150",
                            group.type === "single" && "rounded-full",
                            group.type === "multiple" && "rounded-md",
                            isSelected ? "border-brand bg-brand" : "border-line"
                          )}
                        >
                          <AnimatePresence>
                            {isSelected && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                                className="h-2 w-2 rounded-full bg-brand-foreground"
                              />
                            )}
                          </AnimatePresence>
                        </span>
                        <span className="text-sm font-medium text-ink">{text(choice.name)}</span>
                      </span>
                      {choice.priceDeltaCents !== 0 && (
                        <span className="font-mono text-sm text-ink-soft">
                          {choice.priceDeltaCents > 0 ? "+" : ""}
                          {formatCurrencyCents(choice.priceDeltaCents)}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <label htmlFor="item-notes" className="font-semibold text-ink">
              {t("itemDetail.notesLabel")}
            </label>
            <textarea
              id="item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("itemDetail.notesPlaceholder")}
              rows={2}
              maxLength={300}
              className="w-full resize-none rounded-[var(--radius-lg)] border border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-ink"
            />
          </div>

          <div className="flex items-center justify-between pb-2">
            <span className="font-semibold text-ink">{t("itemDetail.quantity")}</span>
            <QuantityStepper value={quantity} onChange={setQuantity} />
          </div>
        </div>
      )}
    </Sheet>
  );
}
