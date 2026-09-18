import { db } from "@/lib/db/client";

/**
 * Comissão de garçom: sempre calculada em cima de orders.subtotal_cents
 * (pedidos não cancelados) vinculados ao garçom via orders.waiter_id,
 * multiplicado pelo commission_pct configurado para aquele garçom em
 * users.commission_pct. Nunca armazenamos o valor da comissão — é derivado
 * a cada consulta, então mudar o percentual não corrompe histórico algum
 * (o histórico recalcula com o percentual vigente à época seria mais
 * correto ainda, mas exigiria guardar snapshot por pedido; manter simples
 * por ora e documentar a limitação).
 */

export interface WaiterCommissionSummary {
  waiterId: string;
  commissionPct: number;
  salesTodayCents: number;
  commissionTodayCents: number;
  salesPeriodCents: number;
  commissionPeriodCents: number;
  salesAllTimeCents: number;
  commissionAllTimeCents: number;
  history: { date: string; salesCents: number; commissionCents: number }[];
}

/**
 * @param periodDays janela em dias para "comissão do período" (padrão 30).
 * @param historyDays quantos dias trazer no histórico diário (padrão 14).
 */
export async function getWaiterCommissionSummary(
  waiterId: string,
  restaurantId: string,
  { periodDays = 30, historyDays = 14 }: { periodDays?: number; historyDays?: number } = {}
): Promise<WaiterCommissionSummary> {
  const userRows = await db().query<{ commission_pct: number }>(
    "SELECT commission_pct FROM users WHERE id = $1 AND restaurant_id = $2 AND role = 'waiter'",
    [waiterId, restaurantId]
  );
  const commissionPct = userRows[0]?.commission_pct ?? 0;

  const totalsRows = await db().query<{
    sales_today: string | null;
    sales_period: string | null;
    sales_all_time: string | null;
  }>(
    `SELECT
       COALESCE(SUM(subtotal_cents) FILTER (WHERE created_at::date = now()::date), 0) AS sales_today,
       COALESCE(SUM(subtotal_cents) FILTER (WHERE created_at >= now() - ($3 || ' days')::interval), 0) AS sales_period,
       COALESCE(SUM(subtotal_cents), 0) AS sales_all_time
     FROM orders
     WHERE waiter_id = $1 AND restaurant_id = $2 AND status <> 'cancelled'`,
    [waiterId, restaurantId, periodDays]
  );
  const totals = totalsRows[0];
  const salesTodayCents = Number(totals?.sales_today ?? 0);
  const salesPeriodCents = Number(totals?.sales_period ?? 0);
  const salesAllTimeCents = Number(totals?.sales_all_time ?? 0);

  const historyRows = await db().query<{ day: string; sales: string }>(
    `SELECT created_at::date::text AS day, SUM(subtotal_cents) AS sales
     FROM orders
     WHERE waiter_id = $1 AND restaurant_id = $2 AND status <> 'cancelled'
       AND created_at >= now() - ($3 || ' days')::interval
     GROUP BY created_at::date
     ORDER BY created_at::date DESC`,
    [waiterId, restaurantId, historyDays]
  );

  const commission = (salesCents: number) => Math.round(salesCents * (commissionPct / 100));

  return {
    waiterId,
    commissionPct,
    salesTodayCents,
    commissionTodayCents: commission(salesTodayCents),
    salesPeriodCents,
    commissionPeriodCents: commission(salesPeriodCents),
    salesAllTimeCents,
    commissionAllTimeCents: commission(salesAllTimeCents),
    history: historyRows.map((r) => {
      const salesCents = Number(r.sales);
      return { date: r.day, salesCents, commissionCents: commission(salesCents) };
    }),
  };
}

export interface RestaurantWaiterCommission {
  waiterId: string;
  displayName: string;
  commissionPct: number;
  isActive: boolean;
  salesAllTimeCents: number;
  commissionAllTimeCents: number;
  salesPeriodCents: number;
  commissionPeriodCents: number;
}

/** Visão do gerente: comissão de todos os garçons do restaurante. */
export async function listRestaurantWaiterCommissions(
  restaurantId: string,
  periodDays = 30
): Promise<RestaurantWaiterCommission[]> {
  const rows = await db().query<{
    id: string;
    display_name: string;
    commission_pct: number;
    is_active: boolean;
    sales_all_time: string | null;
    sales_period: string | null;
  }>(
    `SELECT u.id, u.display_name, u.commission_pct, u.is_active,
            COALESCE(SUM(o.subtotal_cents), 0) AS sales_all_time,
            COALESCE(SUM(o.subtotal_cents) FILTER (
              WHERE o.created_at >= now() - ($2 || ' days')::interval
            ), 0) AS sales_period
     FROM users u
     LEFT JOIN orders o
       ON o.waiter_id = u.id AND o.restaurant_id = u.restaurant_id AND o.status <> 'cancelled'
     WHERE u.restaurant_id = $1 AND u.role = 'waiter'
     GROUP BY u.id, u.display_name, u.commission_pct, u.is_active
     ORDER BY u.display_name ASC`,
    [restaurantId, periodDays]
  );

  return rows.map((r) => {
    const salesAllTimeCents = Number(r.sales_all_time);
    const salesPeriodCents = Number(r.sales_period);
    const pct = r.commission_pct;
    return {
      waiterId: r.id,
      displayName: r.display_name,
      commissionPct: pct,
      isActive: Boolean(r.is_active),
      salesAllTimeCents,
      commissionAllTimeCents: Math.round(salesAllTimeCents * (pct / 100)),
      salesPeriodCents,
      commissionPeriodCents: Math.round(salesPeriodCents * (pct / 100)),
    };
  });
}
