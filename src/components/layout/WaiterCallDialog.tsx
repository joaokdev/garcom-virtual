"use client";

import { BellRing } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/useTranslation";

export function WaiterCallDialog({
  isOpen,
  onClose,
  onConfirm,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
          <BellRing className="h-7 w-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-display text-xl font-semibold text-ink">
            {t("waiterCall.confirmTitle")}
          </h2>
          <p className="text-sm text-ink-soft">{t("waiterCall.confirmBody")}</p>
        </div>
        <div className="space-y-2">
          <Button variant="primary" size="lg" fullWidth loading={loading} onClick={onConfirm}>
            {t("waiterCall.confirmAction")}
          </Button>
          <Button variant="ghost" size="md" fullWidth onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
