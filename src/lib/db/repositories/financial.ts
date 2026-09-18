import { db } from "@/lib/db/client";

export interface FinancialSummary {
  totalRevenueCents: number;
  totalOrders: number;
  averageTicketCents: number;
  totalServiceFeeCents: number;
  serviceFeePct: number;
  paymentBreakdown: { method: string; count: number; totalCents: number }[];
  hourlyRevenue: { hour: string; totalCents: number }[];
}

export interface FinancialOrder {
  id: string;
  ticketNumber: number;
  tableLabel: string;
  status: string;
  subtotalCents: number;
  serviceFeeCents: number;
  totalCents: number;
  paymentPreference: string | null;
  itemCount: number;
  createdAt: string;
}

export async function getFinancialSummary(
  restaurantId: string,
  dateFrom: string,
  dateTo: string
): Promise<FinancialSummary> {
  const restaurantRows = await db().query<{ service_fee_pct: number }>(
    "SELECT service_fee_pct FROM restaurants WHERE id = $1",
    [restaurantId]
  );
  const serviceFeePct: number = restaurantRows[0]?.service_fee_pct ?? 0;

  const summaryRows = await db().query<{ total_revenue: number; total_orders: number }>(
    `SELECT
      COALESCE(SUM(subtotal_cents), 0) AS total_revenue,
      COUNT(*) AS total_orders
    FROM orders
    WHERE restaurant_id = $1
      AND status NOT IN ('cancelled')
      AND created_at::date >= $2::date
      AND created_at::date <= $3::date`,
    [restaurantId, dateFrom, dateTo]
  );

  const totalRevenueCents: number = summaryRows[0]?.total_revenue ?? 0;
  const totalOrders: number = summaryRows[0]?.total_orders ?? 0;
  const averageTicketCents = totalOrders > 0 ? Math.round(totalRevenueCents / totalOrders) : 0;
  const totalServiceFeeCents = Math.round(totalRevenueCents * (serviceFeePct / 100));

  // Breakdown por preferência de pagamento (via bill_requests)
  const paymentRows = await db().query<{ method: string; cnt: number; total: number }>(
    `SELECT
      COALESCE(br.payment_preference, 'indefinido') AS method,
      COUNT(DISTINCT o.id) AS cnt,
      COALESCE(SUM(o.subtotal_cents), 0) AS total
    FROM orders o
    LEFT JOIN bill_requests br ON br.table_id = o.table_id
      AND br.created_at::date = o.created_at::date
    WHERE o.restaurant_id = $1
      AND o.status NOT IN ('cancelled')
      AND o.created_at::date >= $2::date
      AND o.created_at::date <= $3::date
    GROUP BY method
    ORDER BY total DESC`,
    [restaurantId, dateFrom, dateTo]
  );

  const paymentBreakdown = paymentRows.map((r) => ({
    method: r.method,
    count: r.cnt,
    totalCents: r.total,
  }));

  // Receita por hora do dia
  const hourlyRows = await db().query<{ hour: string; total: number }>(
    `SELECT
      to_char(created_at, 'HH24') AS hour,
      SUM(subtotal_cents) AS total
    FROM orders
    WHERE restaurant_id = $1
      AND status NOT IN ('cancelled')
      AND created_at::date >= $2::date
      AND created_at::date <= $3::date
    GROUP BY hour
    ORDER BY hour ASC`,
    [restaurantId, dateFrom, dateTo]
  );

  const hourlyRevenue = hourlyRows.map((r) => ({
    hour: `${r.hour}h`,
    totalCents: r.total,
  }));

  return {
    totalRevenueCents,
    totalOrders,
    averageTicketCents,
    totalServiceFeeCents,
    serviceFeePct,
    paymentBreakdown,
    hourlyRevenue,
  };
}

export async function listOrdersForFinancial(
  restaurantId: string,
  dateFrom: string,
  dateTo: string,
  limit = 100
): Promise<FinancialOrder[]> {
  const rows = await db().query<{
    id: string;
    ticket_number: number;
    table_label: string;
    status: string;
    subtotal_cents: number;
    created_at: string;
    payment_preference: string | null;
    item_count: number;
  }>(
    `SELECT
      o.id,
      o.ticket_number,
      rt.label AS table_label,
      o.status,
      o.subtotal_cents,
      o.created_at,
      (SELECT br.payment_preference FROM bill_requests br
        WHERE br.table_id = o.table_id AND br.status = 'pending'
        ORDER BY br.created_at DESC LIMIT 1) AS payment_preference,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
    FROM orders o
    JOIN restaurant_tables rt ON rt.id = o.table_id
    WHERE o.restaurant_id = $1
      AND o.created_at::date >= $2::date
      AND o.created_at::date <= $3::date
    ORDER BY o.created_at DESC
    LIMIT $4`,
    [restaurantId, dateFrom, dateTo, limit]
  );

  const feeRows = await db().query<{ service_fee_pct: number }>(
    "SELECT service_fee_pct FROM restaurants WHERE id = $1",
    [restaurantId]
  );
  const serviceFeePct = feeRows[0]?.service_fee_pct ?? 0;

  return rows.map((r) => {
    const serviceFeeCents = Math.round(r.subtotal_cents * (serviceFeePct / 100));
    return {
      id: r.id,
      ticketNumber: r.ticket_number,
      tableLabel: r.table_label,
      status: r.status,
      subtotalCents: r.subtotal_cents,
      serviceFeeCents,
      totalCents: r.subtotal_cents + serviceFeeCents,
      paymentPreference: r.payment_preference,
      itemCount: r.item_count,
      createdAt: r.created_at,
    };
  });
}
