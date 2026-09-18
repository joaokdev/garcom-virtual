import { db } from "@/lib/db/client";
import { newId } from "@/lib/id";
import { mapWaiterCall } from "@/lib/db/mappers";
import { NotFoundError } from "@/lib/errors";
import type { WaiterCallRecord } from "@/types";

export async function createWaiterCall(
  restaurantId: string,
  tableId: string,
  deviceId: string,
  reason = "assistance"
): Promise<WaiterCallRecord> {
  const id = newId("wc");
  const now = new Date().toISOString();
  await db().query(
    `INSERT INTO waiter_calls (id, restaurant_id, table_id, device_id, reason, status, created_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
    [id, restaurantId, tableId, deviceId, reason, now]
  );

  return { id, restaurantId, tableId, status: "pending", createdAt: now };
}

/** Evita chamadas duplicadas: retorna chamada pendente já existente da mesa, se houver. */
export async function getPendingCallForTable(tableId: string): Promise<WaiterCallRecord | null> {
  const rows = await db().query(
    "SELECT * FROM waiter_calls WHERE table_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
    [tableId]
  );
  return rows[0] ? mapWaiterCall(rows[0]) : null;
}

export interface WaiterCallWithTable {
  id: string;
  tableId: string;
  tableLabel: string;
  reason: string;
  status: string;
  createdAt: string;
}

/** Todas as chamadas pendentes do restaurante, com o rótulo da mesa — para o app do Garçom. */
export async function listPendingWaiterCalls(restaurantId: string): Promise<WaiterCallWithTable[]> {
  const rows = await db().query<{
    id: string; table_id: string; table_label: string; reason: string; status: string; created_at: string;
  }>(
    `SELECT wc.id, wc.table_id, rt.label AS table_label, wc.reason, wc.status, wc.created_at
     FROM waiter_calls wc
     JOIN restaurant_tables rt ON rt.id = wc.table_id
     WHERE wc.restaurant_id = $1 AND wc.status = 'pending'
     ORDER BY wc.created_at ASC`,
    [restaurantId]
  );

  return rows.map((r) => ({
    id: r.id,
    tableId: r.table_id,
    tableLabel: r.table_label,
    reason: r.reason,
    status: r.status,
    createdAt: r.created_at,
  }));
}

/**
 * Marca a chamada como resolvida (garçom já atendeu a mesa).
 * Escopada por restaurantId — mesma proteção contra IDOR entre inquilinos
 * aplicada às demais mutações usadas pelos painéis de equipe.
 */
export async function resolveWaiterCall(restaurantId: string, callId: string): Promise<void> {
  const result = await db().query(
    "UPDATE waiter_calls SET status = 'resolved', resolved_at = $1 WHERE id = $2 AND restaurant_id = $3 RETURNING id",
    [new Date().toISOString(), callId, restaurantId]
  );
  if (result.length === 0) {
    throw new NotFoundError("Chamada não encontrada.");
  }
}
