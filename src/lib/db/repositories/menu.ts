import { db } from "@/lib/db/client";
import {
  mapCategory,
  mapMenuItem,
  mapOptionChoice,
  mapOptionGroup,
} from "@/lib/db/mappers";
import type { MenuCategoryWithItems, MenuItem, OptionGroup } from "@/types";

async function loadOptionGroupsForItem(menuItemId: string): Promise<OptionGroup[]> {
  const groupRows = await db().query(
    "SELECT * FROM item_option_groups WHERE menu_item_id = $1 ORDER BY position ASC",
    [menuItemId]
  );

  return Promise.all(
    groupRows.map(async (g) => {
      const choiceRows = await db().query(
        "SELECT * FROM item_option_choices WHERE option_group_id = $1 ORDER BY position ASC",
        [g.id]
      );
      const choices = choiceRows.map((c) => mapOptionChoice(c));
      return mapOptionGroup(g, choices);
    })
  );
}

async function loadRecommendationsForItem(menuItemId: string): Promise<string[]> {
  const rows = await db().query<{ recommended_item_id: string }>(
    "SELECT recommended_item_id FROM item_recommendations WHERE menu_item_id = $1",
    [menuItemId]
  );
  return rows.map((r) => r.recommended_item_id);
}

/**
 * Retorna o cardápio completo de um restaurante, organizado por categoria,
 * já com grupos de opções e recomendações carregados.
 * `includeUnavailable` é usado pelo módulo Admin; o cliente sempre recebe
 * apenas itens disponíveis.
 */
export async function getMenuForRestaurant(
  restaurantId: string,
  includeUnavailable = false
): Promise<MenuCategoryWithItems[]> {
  const categoryRows = await db().query(
    "SELECT * FROM categories WHERE restaurant_id = $1 ORDER BY position ASC",
    [restaurantId]
  );

  const itemQuery = includeUnavailable
    ? "SELECT * FROM menu_items WHERE category_id = $1 ORDER BY position ASC"
    : "SELECT * FROM menu_items WHERE category_id = $1 AND is_available = true ORDER BY position ASC";

  return Promise.all(
    categoryRows.map(async (categoryRow) => {
      const category = mapCategory(categoryRow);
      const itemRows = await db().query(itemQuery, [category.id]);

      const items: MenuItem[] = await Promise.all(
        itemRows.map(async (i) => {
          const optionGroups = await loadOptionGroupsForItem(i.id as string);
          const recommendedItemIds = await loadRecommendationsForItem(i.id as string);
          return mapMenuItem(i, optionGroups, recommendedItemIds);
        })
      );

      return { ...category, items };
    })
  );
}

export async function getMenuItemById(menuItemId: string): Promise<MenuItem | null> {
  const rows = await db().query("SELECT * FROM menu_items WHERE id = $1", [menuItemId]);
  const row = rows[0];
  if (!row) return null;
  const optionGroups = await loadOptionGroupsForItem(row.id as string);
  const recommendedItemIds = await loadRecommendationsForItem(row.id as string);
  return mapMenuItem(row, optionGroups, recommendedItemIds);
}

/** Itens mais pedidos do restaurante (para recomendações sem histórico do cliente) */
export async function getMostOrderedItemIds(restaurantId: string, limit = 6): Promise<string[]> {
  const rows = await db().query<{ id: string; total: number }>(
    `SELECT oi.menu_item_id as id, COUNT(*) as total
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.restaurant_id = $1
     GROUP BY oi.menu_item_id
     ORDER BY total DESC
     LIMIT $2`,
    [restaurantId, limit]
  );
  return rows.map((r) => r.id);
}
