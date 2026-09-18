"use client";

import { BellRing, ClipboardList, Receipt, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { IconButton } from "@/components/ui/IconButton";
import { RestaurantMark } from "@/components/brand/RestaurantMark";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { Restaurant, RestaurantTableInfo, TableSession } from "@/types";

export function Header({
  restaurant,
  table,
  session,
  waiterCallPending,
  billRequestPending,
  onCallWaiter,
  onRequestBill,
  onOpenHistory,
  onOpenSettings,
}: {
  restaurant: Restaurant;
  table: RestaurantTableInfo;
  session: TableSession | null;
  waiterCallPending: boolean;
  billRequestPending: boolean;
  onCallWaiter: () => void;
  onRequestBill: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}) {
  const { t } = useTranslation();

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="material-thin safe-top sticky top-0 z-30"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <RestaurantMark
            name={restaurant.name}
            logoIcon={restaurant.logoIcon}
            size="sm"
            className="shadow-[var(--shadow-card)]"
          />
          <div className="min-w-0">
            <h1 className="truncate font-display text-[1.1rem] font-bold leading-tight text-ink">
              {restaurant.name}
            </h1>
            <div className="flex items-center gap-1.5">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-brand">
                {table.label}
              </p>
              {session && (
                <>
                  <span className="text-[10px] text-ink-faint">·</span>
                  <p className="truncate text-[12px] font-medium text-ink-soft max-w-[100px]">
                    {session.customerName.split(" ")[0]}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <IconButton
            icon={<BellRing className="h-5 w-5" />}
            label={t("header.callWaiter")}
            badge={waiterCallPending}
            onClick={onCallWaiter}
          />
          <IconButton
            icon={<Receipt className="h-5 w-5" />}
            label={t("header.requestBill")}
            badge={billRequestPending}
            onClick={onRequestBill}
          />
          <IconButton
            icon={<ClipboardList className="h-5 w-5" />}
            label={t("header.myOrders")}
            onClick={onOpenHistory}
            className="hidden sm:inline-flex"
          />
          <IconButton
            icon={<Settings className="h-5 w-5" />}
            label={t("header.settings")}
            onClick={onOpenSettings}
          />
        </div>
      </div>
    </motion.header>
  );
}
