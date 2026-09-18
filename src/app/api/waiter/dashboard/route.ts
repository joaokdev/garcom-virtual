import { NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/db/repositories/restaurants";
import { listKitchenOrders } from "@/lib/db/repositories/orders";
import { listPendingWaiterCalls } from "@/lib/db/repositories/waiterCalls";
import { listPendingBillRequests } from "@/lib/db/repositories/billRequests";
import { getWaiterAppUser } from "@/lib/user-auth";
import { handleApiError } from "@/lib/api-handler";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") ?? "";
    const restaurant = await getRestaurantBySlug(slug);
    if (!restaurant) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

    if (!(await getWaiterAppUser(restaurant.id))) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const allOrders = await listKitchenOrders(restaurant.id);
    const readyOrders = allOrders.filter((o) => o.status === "ready");
    const waiterCalls = await listPendingWaiterCalls(restaurant.id);
    const billRequests = await listPendingBillRequests(restaurant.id);

    return NextResponse.json({ readyOrders, waiterCalls, billRequests });
  } catch (error) {
    return handleApiError(error);
  }
}
