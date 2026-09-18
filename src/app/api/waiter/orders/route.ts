import { NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/db/repositories/restaurants";
import { updateOrderStatus } from "@/lib/db/repositories/orders";
import { getWaiterAppUser } from "@/lib/user-auth";
import { handleApiError } from "@/lib/api-handler";

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") ?? "";
    const restaurant = await getRestaurantBySlug(slug);
    if (!restaurant) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

    if (!(await getWaiterAppUser(restaurant.id))) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { orderId } = (await request.json()) as { orderId: string };
    // Escopada por restaurant.id — impede que o garçom de um restaurante
    // altere pedidos de outro (proteção contra IDOR).
    await updateOrderStatus(restaurant.id, orderId, "delivered");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
