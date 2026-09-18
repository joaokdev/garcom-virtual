import { db } from "@/lib/db/client";
import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors";
import { hashPin } from "@/lib/db/repositories/auth";
import type { I18nText } from "@/types";

export interface AdminCategory {
  id: string;
  name: string;
  position: number;
  itemCount: number;
}

export interface AdminProduct {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isChefRecommendation: boolean;
  prepTimeMinutes: number;
  tags: string[];
  position: number;
}

function toI18n(text: string): I18nText {
  // O proprietário cadastra em pt-BR; o mesmo texto preenche os três
  // idiomas como ponto de partida (tradução manual fica para uma fase futura).
  return { "pt-BR": text, en: text, es: text };
}

/** Aceita tanto objeto (JSONB já desserializado pelo driver) quanto string (defensivo). */
function fromI18n(raw: unknown): string {
  let parsed: I18nText;
  if (raw && typeof raw === "object") {
    parsed = raw as I18nText;
  } else if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as I18nText;
    } catch {
      return raw;
    }
  } else {
    return "";
  }
  return parsed["pt-BR"] ?? Object.values(parsed)[0] ?? "";
}

// ---------------------------------------------------------------------------
// CATEGORIAS
// ---------------------------------------------------------------------------

export async function listAdminCategories(restaurantId: string): Promise<AdminCategory[]> {
  const rows = await db().query<{ id: string; name_i18n: unknown; position: number; item_count: number }>(
    `SELECT c.id, c.name_i18n, c.position,
            (SELECT COUNT(*) FROM menu_items mi WHERE mi.category_id = c.id) AS item_count
     FROM categories c
     WHERE c.restaurant_id = $1
     ORDER BY c.position ASC`,
    [restaurantId]
  );

  return rows.map((r) => ({
    id: r.id,
    name: fromI18n(r.name_i18n),
    position: r.position,
    itemCount: r.item_count,
  }));
}

export async function createCategory(restaurantId: string, name: string): Promise<AdminCategory> {
  const maxPosRows = await db().query<{ maxpos: number }>(
    "SELECT COALESCE(MAX(position), -1) AS maxPos FROM categories WHERE restaurant_id = $1",
    [restaurantId]
  );

  const id = `cat_${randomUUID()}`;
  const position = (maxPosRows[0]?.maxpos ?? -1) + 1;
  await db().query(
    "INSERT INTO categories (id, restaurant_id, name_i18n, position, created_at) VALUES ($1, $2, $3, $4, $5)",
    [id, restaurantId, JSON.stringify(toI18n(name)), position, new Date().toISOString()]
  );

  return { id, name, position, itemCount: 0 };
}

/**
 * Renomeia a categoria — escopada por restaurantId: garante que um admin
 * autenticado no restaurante A nunca consiga alterar dados do restaurante B,
 * mesmo que descubra/adivinhe o id de uma categoria alheia (IDOR).
 */
export async function renameCategory(
  restaurantId: string,
  categoryId: string,
  name: string
): Promise<void> {
  const result = await db().query(
    "UPDATE categories SET name_i18n = $1 WHERE id = $2 AND restaurant_id = $3 RETURNING id",
    [JSON.stringify(toI18n(name)), categoryId, restaurantId]
  );
  if (result.length === 0) {
    throw new AppError("Categoria não encontrada.", 404, "NOT_FOUND");
  }
}

export async function deleteCategory(restaurantId: string, categoryId: string): Promise<void> {
  const categoryRows = await db().query<{ id: string }>(
    "SELECT id FROM categories WHERE id = $1 AND restaurant_id = $2",
    [categoryId, restaurantId]
  );
  if (categoryRows.length === 0) {
    throw new AppError("Categoria não encontrada.", 404, "NOT_FOUND");
  }

  const countRows = await db().query<{ n: number }>(
    "SELECT COUNT(*) AS n FROM menu_items WHERE category_id = $1",
    [categoryId]
  );

  if ((countRows[0]?.n ?? 0) > 0) {
    throw new AppError(
      "Mova ou exclua os produtos desta categoria antes de removê-la.",
      409,
      "CATEGORY_NOT_EMPTY"
    );
  }
  await db().query("DELETE FROM categories WHERE id = $1 AND restaurant_id = $2", [
    categoryId,
    restaurantId,
  ]);
}

/** Troca a posição de duas categorias adjacentes (reordenação por seta ↑/↓). */
export async function swapCategoryPosition(
  restaurantId: string,
  categoryId: string,
  direction: "up" | "down"
): Promise<void> {
  const categories = await db().query<{ id: string; position: number }>(
    "SELECT id, position FROM categories WHERE restaurant_id = $1 ORDER BY position ASC",
    [restaurantId]
  );

  const index = categories.findIndex((c) => c.id === categoryId);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= categories.length) return;

  const a = categories[index]!;
  const b = categories[swapIndex]!;

  await db().query("UPDATE categories SET position = $1 WHERE id = $2", [b.position, a.id]);
  await db().query("UPDATE categories SET position = $1 WHERE id = $2", [a.position, b.id]);
}

// ---------------------------------------------------------------------------
// PRODUTOS
// ---------------------------------------------------------------------------

export async function listAdminProducts(
  restaurantId: string,
  filters: { search?: string; categoryId?: string }
): Promise<AdminProduct[]> {
  const rows = await db().query<{
    id: string; category_id: string; category_name_i18n: unknown;
    name_i18n: unknown; description_i18n: unknown; price_cents: number;
    image_url: string | null; is_available: boolean; is_chef_recommendation: boolean;
    prep_time_minutes: number; tags_json: unknown; position: number;
  }>(
    `SELECT mi.id, mi.category_id, c.name_i18n AS category_name_i18n,
            mi.name_i18n, mi.description_i18n, mi.price_cents, mi.image_url,
            mi.is_available, mi.is_chef_recommendation, mi.prep_time_minutes,
            mi.tags_json, mi.position
     FROM menu_items mi
     JOIN categories c ON c.id = mi.category_id
     WHERE mi.restaurant_id = $1
     ORDER BY c.position ASC, mi.position ASC`,
    [restaurantId]
  );

  let products: AdminProduct[] = rows.map((r) => ({
    id: r.id,
    categoryId: r.category_id,
    categoryName: fromI18n(r.category_name_i18n),
    name: fromI18n(r.name_i18n),
    description: fromI18n(r.description_i18n),
    priceCents: r.price_cents,
    imageUrl: r.image_url,
    isAvailable: Boolean(r.is_available),
    isChefRecommendation: Boolean(r.is_chef_recommendation),
    prepTimeMinutes: r.prep_time_minutes,
    tags: Array.isArray(r.tags_json) ? r.tags_json : [],
    position: r.position,
  }));

  if (filters.categoryId) {
    products = products.filter((p) => p.categoryId === filters.categoryId);
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    products = products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }

  return products;
}

export interface ProductInput {
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isChefRecommendation: boolean;
  prepTimeMinutes: number;
  tags: string[];
}

export async function createProduct(restaurantId: string, input: ProductInput): Promise<string> {
  const maxPosRows = await db().query<{ maxpos: number }>(
    "SELECT COALESCE(MAX(position), -1) AS maxPos FROM menu_items WHERE category_id = $1",
    [input.categoryId]
  );

  const id = `item_${randomUUID()}`;
  await db().query(
    `INSERT INTO menu_items (
      id, restaurant_id, category_id, name_i18n, description_i18n, price_cents,
      image_url, is_available, is_chef_recommendation, prep_time_minutes,
      tags_json, position, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      id,
      restaurantId,
      input.categoryId,
      JSON.stringify(toI18n(input.name)),
      JSON.stringify(toI18n(input.description)),
      input.priceCents,
      input.imageUrl,
      input.isAvailable,
      input.isChefRecommendation,
      input.prepTimeMinutes,
      JSON.stringify(input.tags),
      (maxPosRows[0]?.maxpos ?? -1) + 1,
      new Date().toISOString(),
    ]
  );

  return id;
}

export async function updateProduct(
  restaurantId: string,
  productId: string,
  input: ProductInput
): Promise<void> {
  const result = await db().query(
    `UPDATE menu_items SET
      category_id = $1, name_i18n = $2, description_i18n = $3, price_cents = $4,
      image_url = $5, is_available = $6, is_chef_recommendation = $7,
      prep_time_minutes = $8, tags_json = $9
    WHERE id = $10 AND restaurant_id = $11
    RETURNING id`,
    [
      input.categoryId,
      JSON.stringify(toI18n(input.name)),
      JSON.stringify(toI18n(input.description)),
      input.priceCents,
      input.imageUrl,
      input.isAvailable,
      input.isChefRecommendation,
      input.prepTimeMinutes,
      JSON.stringify(input.tags),
      productId,
      restaurantId,
    ]
  );
  if (result.length === 0) {
    throw new AppError("Produto não encontrado.", 404, "NOT_FOUND");
  }
}

export async function setProductAvailability(
  restaurantId: string,
  productId: string,
  isAvailable: boolean
): Promise<void> {
  const result = await db().query(
    "UPDATE menu_items SET is_available = $1 WHERE id = $2 AND restaurant_id = $3 RETURNING id",
    [isAvailable, productId, restaurantId]
  );
  if (result.length === 0) {
    throw new AppError("Produto não encontrado.", 404, "NOT_FOUND");
  }
}

export async function deleteProduct(restaurantId: string, productId: string): Promise<void> {
  const result = await db().query(
    "DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2 RETURNING id",
    [productId, restaurantId]
  );
  if (result.length === 0) {
    throw new AppError("Produto não encontrado.", 404, "NOT_FOUND");
  }
}

// ---------------------------------------------------------------------------
// RESTAURANTES — criação e listagem (para o hub de gestão)
// ---------------------------------------------------------------------------

export interface RestaurantInput {
  name: string;
  slug: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  logoIcon: string | null;
  serviceFeePct: number;
  kitchenPin: string;
  financialPin: string;
  adminPin: string;
}

export async function createRestaurant(input: RestaurantInput): Promise<string> {
  // Valida unicidade do slug
  const existing = await db().query("SELECT id FROM restaurants WHERE slug = $1", [input.slug]);
  if (existing[0]) {
    throw new AppError(`O slug "${input.slug}" já está em uso.`, 409, "SLUG_TAKEN");
  }

  const restaurantId = `rest_${randomUUID()}`;
  await db().query(
    `INSERT INTO restaurants (
      id, slug, name, tagline, logo_emoji, logo_icon,
      primary_color, accent_color, default_locale,
      service_fee_pct, kitchen_pin_hash, financial_pin_hash, admin_pin_hash,
      is_active, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pt-BR', $9, $10, $11, $12, true, $13)`,
    [
      restaurantId,
      input.slug,
      input.name,
      input.tagline,
      "🍽️",
      input.logoIcon,
      input.primaryColor,
      input.accentColor,
      input.serviceFeePct,
      hashPin(input.kitchenPin),
      hashPin(input.financialPin),
      hashPin(input.adminPin),
      new Date().toISOString(),
    ]
  );

  // Cria 4 mesas padrão automaticamente
  for (let i = 1; i <= 4; i++) {
    await db().query(
      `INSERT INTO restaurant_tables (id, restaurant_id, label, qr_token, capacity, is_active, created_at)
       VALUES ($1, $2, $3, $4, 4, true, $5)`,
      [`table_${randomUUID()}`, restaurantId, `Mesa ${i}`, randomUUID(), new Date().toISOString()]
    );
  }

  return restaurantId;
}
