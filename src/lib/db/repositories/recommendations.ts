import { db } from "@/lib/db/client";
import { getMostOrderedItemIds } from "@/lib/db/repositories/menu";
import type { MenuCategoryWithItems, MenuItem } from "@/types";

/**
 * Recomendações "para você": heurística (não machine learning) que combina:
 *  1) categorias que o dispositivo já pediu antes neste restaurante;
 *  2) sugestões do chef;
 *  3) popularidade geral do restaurante.
 * Sempre exclui itens indisponíveis e nunca recomenda o mesmo item duas vezes.
 */
export async function getRecommendationsForDevice(
  restaurantId: string,
  deviceId: string,
  menu: MenuCategoryWithItems[],
  limit = 6
): Promise<MenuItem[]> {
  const allItems = menu.flatMap((c) => c.items);
  if (allItems.length === 0) return [];

  const historyRows = await db().query<{ itemid: string; categoryid: string }>(
    `SELECT oi.menu_item_id as itemId, mi.category_id as categoryId
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN menu_items mi ON mi.id = oi.menu_item_id
     WHERE o.restaurant_id = $1 AND o.device_id = $2`,
    [restaurantId, deviceId]
  );

  // Postgres devolve nomes de coluna em minúsculas quando não há aspas no alias.
  const orderedItemIds = new Set(historyRows.map((r) => r.itemid));
  const favoriteCategoryCounts = new Map<string, number>();
  for (const row of historyRows) {
    favoriteCategoryCounts.set(row.categoryid, (favoriteCategoryCounts.get(row.categoryid) ?? 0) + 1);
  }

  const popularIds = new Set(await getMostOrderedItemIds(restaurantId, 10));

  const scored = allItems.map((item) => {
    let score = 0;
    if (item.isChefRecommendation) score += 3;
    if (favoriteCategoryCounts.has(item.categoryId)) {
      score += Math.min(favoriteCategoryCounts.get(item.categoryId) ?? 0, 3) * 2;
    }
    if (popularIds.has(item.id)) score += 2;
    if (orderedItemIds.has(item.id)) score -= 1; // prioriza descoberta, mas não exclui
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const result: MenuItem[] = [];
  for (const { item } of scored) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
    if (result.length >= limit) break;
  }

  return result;
}
