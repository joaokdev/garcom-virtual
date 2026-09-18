import type {
  BillRequestRecord,
  Category,
  I18nText,
  MenuItem,
  OptionChoice,
  OptionGroup,
  Restaurant,
  RestaurantTableInfo,
  WaiterCallRecord,
} from "@/types";

// O driver "pg" já desserializa colunas JSON/JSONB automaticamente em
// objetos/arrays JS. Aceitamos os dois formatos (string ou já-parseado) para
// não depender de detalhe de driver — e para não quebrar caso algum dia essas
// colunas voltem a ser lidas de outra fonte.
function parseI18n(raw: unknown): I18nText {
  if (raw && typeof raw === "object") return raw as I18nText;
  if (typeof raw !== "string" || raw.length === 0) return {};
  try {
    return JSON.parse(raw) as I18nText;
  } catch {
    return {};
  }
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string" || raw.length === 0) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type Row = Record<string, any>;

export function mapRestaurant(row: Row): Restaurant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline ?? null,
    logoEmoji: row.logo_emoji,
    logoIcon: row.logo_icon ?? null,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    defaultLocale: row.default_locale,
    serviceFeePct: row.service_fee_pct,
    isActive: Boolean(row.is_active),
  };
}

export function mapTable(row: Row): RestaurantTableInfo {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    label: row.label,
    qrToken: row.qr_token,
    capacity: row.capacity,
    isActive: Boolean(row.is_active),
    assumedByWaiterId: row.assumed_by_waiter_id ?? null,
  };
}

export function mapCategory(row: Row): Category {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: parseI18n(row.name_i18n),
    icon: row.icon ?? null,
    position: row.position,
  };
}

export function mapOptionChoice(row: Row): OptionChoice {
  return {
    id: row.id,
    name: parseI18n(row.name_i18n),
    priceDeltaCents: row.price_delta_cents,
    position: row.position,
  };
}

export function mapOptionGroup(row: Row, choices: OptionChoice[]): OptionGroup {
  return {
    id: row.id,
    name: parseI18n(row.name_i18n),
    type: row.type,
    isRequired: Boolean(row.is_required),
    minSelect: row.min_select,
    maxSelect: row.max_select,
    position: row.position,
    choices,
  };
}

export function mapMenuItem(
  row: Row,
  optionGroups: OptionGroup[],
  recommendedItemIds: string[]
): MenuItem {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    categoryId: row.category_id,
    name: parseI18n(row.name_i18n),
    description: parseI18n(row.description_i18n),
    priceCents: row.price_cents,
    imageUrl: row.image_url ?? null,
    isAvailable: Boolean(row.is_available),
    isChefRecommendation: Boolean(row.is_chef_recommendation),
    prepTimeMinutes: row.prep_time_minutes,
    tags: parseTags(row.tags_json),
    position: row.position,
    optionGroups,
    recommendedItemIds,
  };
}

export function mapWaiterCall(row: Row): WaiterCallRecord {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    tableId: row.table_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function mapBillRequest(row: Row): BillRequestRecord {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    tableId: row.table_id,
    paymentPreference: row.payment_preference ?? null,
    status: row.status,
    createdAt: row.created_at,
  };
}
