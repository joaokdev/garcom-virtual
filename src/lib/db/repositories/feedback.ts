import { db } from "@/lib/db/client";
import { newId } from "@/lib/id";
import type { FeedbackRecord } from "@/types";

export async function createFeedback(
  restaurantId: string,
  deviceId: string,
  rating: number,
  comment?: string,
  tableId?: string,
  orderId?: string
): Promise<FeedbackRecord> {
  const id = newId("fb");
  const now = new Date().toISOString();
  await db().query(
    `INSERT INTO feedback (id, restaurant_id, table_id, order_id, device_id, rating, comment, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, restaurantId, tableId ?? null, orderId ?? null, deviceId, rating, comment?.trim() || null, now]
  );

  return {
    id,
    restaurantId,
    rating,
    comment: comment?.trim() || null,
    createdAt: now,
  };
}
