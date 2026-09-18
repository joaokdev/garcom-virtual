import { NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/db/repositories/restaurants";
import { getWaiterAppUser } from "@/lib/user-auth";
import { getWaiterCommissionSummary } from "@/lib/db/repositories/commission";
import { handleApiError } from "@/lib/api-handler";

/** Comissão do próprio garçom logado (superadmin/manager não têm comissão — 403). */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") ?? "";
    const restaurant = await getRestaurantBySlug(slug);
    if (!restaurant) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

    const user = await getWaiterAppUser(restaurant.id);
    if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    if (user.role !== "waiter") {
      return NextResponse.json({ error: "Apenas garçons têm comissão." }, { status: 403 });
    }

    const summary = await getWaiterCommissionSummary(user.id, restaurant.id);
    return NextResponse.json({ summary });
  } catch (error) {
    return handleApiError(error);
  }
}
