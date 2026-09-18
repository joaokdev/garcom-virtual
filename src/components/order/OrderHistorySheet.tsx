"use client";

import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { OrderProgressTrack } from "@/components/order/OrderProgressTrack";
import { fetchOrderHistory } from "@/lib/api-client";
import { formatCurrencyCents, formatTime } from "@/lib/i18n";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { OrderRecord } from "@/types";

export function OrderHistorySheet({
  isOpen,
  onClose,
  restaurantId,
  tableId,
}: {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  tableId?: string;
}) {
  const { t, locale } = useTranslation();
  const [orders, setOrders] = useState<OrderRecord[] | null>(null);
  const [error, setError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function load() {
      try {
        const result = await fetchOrderHistory(restaurantId, tableId);
        if (!cancelled) {
          setOrders(result);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    load();
    const interval = setInterval(load, 6000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, restaurantId, retryToken]);

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={t("orderHistory.title")} closeLabel={t("common.close")} size="tall">
      {orders === null && !error && (
        <div className="space-y-5 pt-1">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {error && (
        <EmptyState
          title={t("errors.networkError")}
          action={
            <Button variant="secondary" size="md" onClick={() => setRetryToken((n) => n + 1)}>
              {t("common.retry")}
            </Button>
          }
        />
      )}

      {orders !== null && orders.length === 0 && (
        <EmptyState
          icon={<ClipboardList className="h-10 w-10" strokeWidth={1.5} />}
          title={t("orderHistory.empty")}
        />
      )}

      {orders !== null && orders.length > 0 && (
        <div className="divide-y divide-line">
          {orders.map((order) => (
            <div key={order.id} className="space-y-3 py-5 first:pt-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-lg font-bold text-ink">
                    {t("orderConfirmation.ticketNumber", { n: order.ticketNumber })}
                  </span>
                  <p className="text-[12px] text-ink-faint">
                    {t("orderHistory.placedAt", { time: formatTime(order.createdAt, locale) })}
                  </p>
                </div>
                <span className="pt-0.5 font-mono text-sm font-semibold text-ink">
                  {formatCurrencyCents(order.subtotalCents)}
                </span>
              </div>

              <OrderProgressTrack status={order.status} />

              <div className="space-y-0.5">
                {order.items.map((item) => (
                  <p key={item.id} className="text-[13px] text-ink-soft">
                    <span className="font-mono font-semibold text-ink-faint">{item.quantity}×</span>{" "}
                    {item.nameSnapshot}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
