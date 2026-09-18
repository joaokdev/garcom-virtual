import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/client";
import { mapRestaurant, mapTable } from "@/lib/db/mappers";
import type { Restaurant, RestaurantTableInfo } from "@/types";

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  const rows = await db().query(
    "SELECT * FROM restaurants WHERE slug = $1 AND is_active = true",
    [slug]
  );
  return rows[0] ? mapRestaurant(rows[0]) : null;
}

export async function getTableByToken(
  restaurantId: string,
  qrToken: string
): Promise<RestaurantTableInfo | null> {
  const rows = await db().query(
    "SELECT * FROM restaurant_tables WHERE restaurant_id = $1 AND qr_token = $2 AND is_active = true",
    [restaurantId, qrToken]
  );
  return rows[0] ? mapTable(rows[0]) : null;
}

export async function getTableById(tableId: string): Promise<RestaurantTableInfo | null> {
  const rows = await db().query("SELECT * FROM restaurant_tables WHERE id = $1", [tableId]);
  return rows[0] ? mapTable(rows[0]) : null;
}

/** Cria uma nova mesa (gera o token do QR code automaticamente). */
export async function createTable(
  restaurantId: string,
  label: string,
  capacity: number
): Promise<RestaurantTableInfo> {
  const id = `table_${randomUUID()}`;
  const qrToken = randomUUID();
  const rows = await db().query(
    `INSERT INTO restaurant_tables (id, restaurant_id, label, qr_token, capacity, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, true, $6) RETURNING *`,
    [id, restaurantId, label, qrToken, capacity, new Date().toISOString()]
  );
  if (!rows[0]) throw new Error("Falha ao criar a mesa.");
  return mapTable(rows[0]);
}

/** Remove uma mesa (soft delete — preserva o histórico de pedidos já feitos nela). */
export async function deactivateTable(tableId: string, restaurantId: string): Promise<boolean> {
  const rows = await db().query(
    "UPDATE restaurant_tables SET is_active = false WHERE id = $1 AND restaurant_id = $2 RETURNING id",
    [tableId, restaurantId]
  );
  return rows.length > 0;
}

/** Usado pela página inicial de demonstração do produto (lista os tenants ativos). */
export async function listActiveRestaurants(): Promise<Restaurant[]> {
  const rows = await db().query(
    "SELECT * FROM restaurants WHERE is_active = true ORDER BY name ASC"
  );
  return rows.map((r) => mapRestaurant(r));
}

/** Usado pela página inicial de demonstração do produto (lista as mesas de um restaurante). */
export async function listTablesForRestaurant(restaurantId: string): Promise<RestaurantTableInfo[]> {
  const rows = await db().query(
    "SELECT * FROM restaurant_tables WHERE restaurant_id = $1 AND is_active = true ORDER BY label ASC",
    [restaurantId]
  );
  return rows.map((r) => mapTable(r));
}

export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  const rows = await db().query("SELECT * FROM restaurants WHERE id = $1", [id]);
  return rows[0] ? mapRestaurant(rows[0]) : null;
}

export async function getRestaurantSlugById(id: string): Promise<string | null> {
  const rows = await db().query<{ slug: string }>("SELECT slug FROM restaurants WHERE id = $1", [id]);
  return rows[0]?.slug ?? null;
}

/**
 * Garçom assume uma mesa manualmente (para fins de comissão): pedidos
 * criados nessa mesa a partir de agora herdam o waiter_id dele. Confere
 * que a mesa pertence ao restaurante do garçom antes de gravar.
 */
export async function assumeTable(
  tableId: string,
  restaurantId: string,
  waiterId: string
): Promise<RestaurantTableInfo | null> {
  const rows = await db().query(
    `UPDATE restaurant_tables SET assumed_by_waiter_id = $1
     WHERE id = $2 AND restaurant_id = $3
     RETURNING *`,
    [waiterId, tableId, restaurantId]
  );
  return rows[0] ? mapTable(rows[0]) : null;
}

/** Libera a mesa (novos pedidos deixam de ser atribuídos a um garçom). */
export async function releaseTable(
  tableId: string,
  restaurantId: string
): Promise<RestaurantTableInfo | null> {
  const rows = await db().query(
    `UPDATE restaurant_tables SET assumed_by_waiter_id = NULL
     WHERE id = $1 AND restaurant_id = $2
     RETURNING *`,
    [tableId, restaurantId]
  );
  return rows[0] ? mapTable(rows[0]) : null;
}
