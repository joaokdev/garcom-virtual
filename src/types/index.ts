// ============================================================================
// Tipos de domínio do Quizio — compartilhados entre DB, API e UI.
// ============================================================================

export type Locale = "pt-BR" | "en" | "es";

// Re-exportação para que componentes possam importar de @/types
export type { TableSession } from "@/lib/table-session";

export const SUPPORTED_LOCALES: Locale[] = ["pt-BR", "en", "es"];

/** Texto com traduções por idioma. Chaves ausentes recorrem ao fallback. */
export type I18nText = Partial<Record<Locale, string>>;

export type OrderStatus =
  | "received"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

export type WaiterCallStatus = "pending" | "acknowledged" | "resolved";
export type BillRequestStatus = "pending" | "closed";
export type OptionGroupType = "single" | "multiple";

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logoEmoji: string;
  logoIcon: string | null;
  primaryColor: string;
  accentColor: string;
  defaultLocale: Locale;
  serviceFeePct: number;
  isActive: boolean;
}

export interface RestaurantTableInfo {
  id: string;
  restaurantId: string;
  label: string;
  qrToken: string;
  capacity: number;
  isActive: boolean;
  /** Garçom que assumiu a mesa no momento (null = mesa livre/não assumida). */
  assumedByWaiterId: string | null;
}

export interface Category {
  id: string;
  restaurantId: string;
  name: I18nText;
  icon: string | null;
  position: number;
}

export interface OptionChoice {
  id: string;
  name: I18nText;
  priceDeltaCents: number;
  position: number;
}

export interface OptionGroup {
  id: string;
  name: I18nText;
  type: OptionGroupType;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  position: number;
  choices: OptionChoice[];
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: I18nText;
  description: I18nText;
  priceCents: number;
  imageUrl: string | null;
  isAvailable: boolean;
  isChefRecommendation: boolean;
  prepTimeMinutes: number;
  tags: string[];
  position: number;
  optionGroups: OptionGroup[];
  recommendedItemIds: string[];
}

export interface MenuCategoryWithItems extends Category {
  items: MenuItem[];
}

/** Carrinho — escolha selecionada de um grupo de opções (client-side) */
export interface SelectedChoice {
  groupId: string;
  choiceId: string;
  name: string;
  priceDeltaCents: number;
}

/** Linha do carrinho (client-side, antes de virar pedido) */
export interface CartLine {
  cartLineId: string; // id local, gerado no client
  menuItemId: string;
  name: string;
  unitBasePriceCents: number;
  prepTimeMinutes: number;
  quantity: number;
  selectedChoices: SelectedChoice[];
  notes: string;
}

export interface OrderItemChoiceRecord {
  id: string;
  nameSnapshot: string;
  priceDeltaCents: number;
}

export interface OrderItemRecord {
  id: string;
  menuItemId: string;
  nameSnapshot: string;
  quantity: number;
  unitPriceCents: number;
  notes: string | null;
  choices: OrderItemChoiceRecord[];
}

export interface OrderRecord {
  id: string;
  restaurantId: string;
  tableId: string;
  tableLabel: string;
  deviceId: string;
  ticketNumber: number;
  status: OrderStatus;
  notes: string | null;
  subtotalCents: number;
  /** Garçom vinculado ao pedido (mesa assumida no momento da criação), para comissão. */
  waiterId: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemRecord[];
}

export interface WaiterCallRecord {
  id: string;
  restaurantId: string;
  tableId: string;
  status: WaiterCallStatus;
  createdAt: string;
}

export interface BillRequestRecord {
  id: string;
  restaurantId: string;
  tableId: string;
  paymentPreference: string | null;
  status: BillRequestStatus;
  createdAt: string;
}

export interface FeedbackRecord {
  id: string;
  restaurantId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}
