import { getDeviceId } from "@/lib/session";
import type {
  BillRequestRecord,
  CartLine,
  FeedbackRecord,
  MenuItem,
  OrderRecord,
  WaiterCallRecord,
} from "@/types";

export class ApiClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
  tableContext?: { restaurantId: string; tableId: string }
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-device-id": getDeviceId(tableContext?.restaurantId, tableContext?.tableId),
      ...init?.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message ?? "Não foi possível completar a ação.";
    throw new ApiClientError(message);
  }

  return data as T;
}

function serializeCartLine(line: CartLine) {
  return {
    menuItemId: line.menuItemId,
    quantity: line.quantity,
    notes: line.notes || undefined,
    selectedChoices: line.selectedChoices.map((c) => ({
      groupId: c.groupId,
      choiceId: c.choiceId,
    })),
  };
}

export async function submitOrder(params: {
  restaurantId: string;
  tableId: string;
  notes?: string;
  lines: CartLine[];
}): Promise<OrderRecord> {
  const ctx = { restaurantId: params.restaurantId, tableId: params.tableId };
  const { order } = await request<{ order: OrderRecord }>(
    "/api/orders",
    {
      method: "POST",
      body: JSON.stringify({
        restaurantId: params.restaurantId,
        tableId: params.tableId,
        notes: params.notes,
        items: params.lines.map(serializeCartLine),
      }),
    },
    ctx
  );
  return order;
}

export async function fetchActiveOrders(restaurantId: string, tableId: string): Promise<OrderRecord[]> {
  const { orders } = await request<{ orders: OrderRecord[] }>(
    `/api/orders?restaurantId=${restaurantId}&tableId=${tableId}&mode=active`,
    undefined,
    { restaurantId, tableId }
  );
  return orders;
}

export async function fetchOrderHistory(restaurantId: string, tableId?: string): Promise<OrderRecord[]> {
  const { orders } = await request<{ orders: OrderRecord[] }>(
    `/api/orders?restaurantId=${restaurantId}&mode=history`,
    undefined,
    tableId ? { restaurantId, tableId } : undefined
  );
  return orders;
}

export async function callWaiter(restaurantId: string, tableId: string): Promise<{ call: WaiterCallRecord; alreadyExisted: boolean }> {
  return request(
    "/api/waiter-calls",
    { method: "POST", body: JSON.stringify({ restaurantId, tableId }) },
    { restaurantId, tableId }
  );
}

export async function requestBill(
  restaurantId: string,
  tableId: string,
  paymentPreference?: "cash" | "card" | "pix"
): Promise<{ request: BillRequestRecord; alreadyExisted: boolean }> {
  return request(
    "/api/bill-requests",
    { method: "POST", body: JSON.stringify({ restaurantId, tableId, paymentPreference }) },
    { restaurantId, tableId }
  );
}

export async function submitFeedback(params: {
  restaurantId: string;
  tableId?: string;
  orderId?: string;
  rating: number;
  comment?: string;
}): Promise<FeedbackRecord> {
  const { feedback } = await request<{ feedback: FeedbackRecord }>(
    "/api/feedback",
    { method: "POST", body: JSON.stringify(params) },
    params.tableId ? { restaurantId: params.restaurantId, tableId: params.tableId } : undefined
  );
  return feedback;
}

export async function fetchRecommendations(restaurantId: string): Promise<MenuItem[]> {
  const { items } = await request<{ items: MenuItem[] }>(
    `/api/recommendations?restaurantId=${restaurantId}`
  );
  return items;
}
