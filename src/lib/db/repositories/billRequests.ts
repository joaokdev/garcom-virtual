import { db } from "@/lib/db/client";
import { newId } from "@/lib/id";
import { mapBillRequest } from "@/lib/db/mappers";
import { NotFoundError } from "@/lib/errors";
import type { BillRequestRecord } from "@/types";

export async function createBillRequest(
  restaurantId: string,
  tableId: string,
  deviceId: string,
  paymentPreference?: string
): Promise<BillRequestRecord> {
  const id = newId("br");
  const now = new Date().toISOString();
  await db().query(
    `INSERT INTO bill_requests (id, restaurant_id, table_id, device_id, payment_preference, status, created_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
    [id, restaurantId, tableId, deviceId, paymentPreference ?? null, now]
  );

  return {
    id,
    restaurantId,
    tableId,
    paymentPreference: paymentPreference ?? null,
    status: "pending",
    createdAt: now,
  };
}

export async function getPendingBillRequestForTable(tableId: string): Promise<BillRequestRecord | null> {
  const rows = await db().query(
    "SELECT * FROM bill_requests WHERE table_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
    [tableId]
  );
  return rows[0] ? mapBillRequest(rows[0]) : null;
}

export interface BillRequestWithTable {
  id: string;
  tableId: string;
  tableLabel: string;
  paymentPreference: string | null;
  status: string;
  createdAt: string;
  totalCents: number;
}

/** Todas as solicitações de conta pendentes do restaurante — para o app do Garçom. */
export async function listPendingBillRequests(restaurantId: string): Promise<BillRequestWithTable[]> {
  const rows = await db().query<{
    id: string; table_id: string; table_label: string;
    payment_preference: string | null; status: string; created_at: string;
  }>(
    `SELECT br.id, br.table_id, rt.label AS table_label, br.payment_preference, br.status, br.created_at
     FROM bill_requests br
     JOIN restaurant_tables rt ON rt.id = br.table_id
     WHERE br.restaurant_id = $1 AND br.status = 'pending'
     ORDER BY br.created_at ASC`,
    [restaurantId]
  );

  return Promise.all(
    rows.map(async (r) => {
      // Soma os pedidos ativos da mesa (não cancelados) feitos no mesmo dia, como referência de valor a cobrar.
      const totalRows = await db().query<{ total: number }>(
        `SELECT COALESCE(SUM(subtotal_cents), 0) AS total
         FROM orders
         WHERE table_id = $1 AND status != 'cancelled'
           AND created_at::date = $2::date`,
        [r.table_id, r.created_at]
      );

      return {
        id: r.id,
        tableId: r.table_id,
        tableLabel: r.table_label,
        paymentPreference: r.payment_preference,
        status: r.status,
        createdAt: r.created_at,
        totalCents: totalRows[0]?.total ?? 0,
      };
    })
  );
}

/**
 * Fecha a solicitação de conta (garçom confirmou que a mesa foi paga/fechada).
 * Escopada por restaurantId para impedir que um garçom de um restaurante
 * feche a conta de outro restaurante (IDOR entre inquilinos).
 */
export async function closeBillRequest(restaurantId: string, requestId: string): Promise<void> {
  const result = await db().query(
    "UPDATE bill_requests SET status = 'closed', closed_at = $1 WHERE id = $2 AND restaurant_id = $3 RETURNING id",
    [new Date().toISOString(), requestId, restaurantId]
  );
  if (result.length === 0) {
    throw new NotFoundError("Solicitação de conta não encontrada.");
  }
}

/**
 * Fecha de uma vez todas as contas pendentes de uma mesa (liberação de mesa
 * pelo Garçom). Um único UPDATE em vez de listar tudo do restaurante e fechar
 * item a item — evita N+1 e é atômico por natureza.
 */
export async function closeBillRequestsForTable(restaurantId: string, tableId: string): Promise<number> {
  const result = await db().query(
    `UPDATE bill_requests SET status = 'closed', closed_at = $1
     WHERE restaurant_id = $2 AND table_id = $3 AND status = 'pending'
     RETURNING id`,
    [new Date().toISOString(), restaurantId, tableId]
  );
  return result.length;
}
