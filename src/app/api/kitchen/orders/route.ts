import { NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/db/repositories/restaurants";
import { listKitchenOrders, updateOrderStatus } from "@/lib/db/repositories/orders";
import { hasValidSession } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-handler";
import type { OrderStatus } from "@/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") ?? "";
    const restaurant = await getRestaurantBySlug(slug);
    if (!restaurant) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

    if (!(await hasValidSession(restaurant.id, "kitchen"))) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const orders = await listKitchenOrders(restaurant.id);
    return NextResponse.json({ orders });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") ?? "";
    const restaurant = await getRestaurantBySlug(slug);
    if (!restaurant) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

    if (!(await hasValidSession(restaurant.id, "kitchen"))) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { orderId, status } = (await request.json()) as { orderId: string; status: OrderStatus };
    const validStatuses: OrderStatus[] = ["received", "preparing", "ready", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 422 });
    }

    // updateOrderStatus é escopada por restaurant.id — impede que a cozinha
    // de um restaurante altere pedidos de outro (proteção contra IDOR).
    await updateOrderStatus(restaurant.id, orderId, status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
