import { NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/db/repositories/restaurants";
import { closeBillRequest } from "@/lib/db/repositories/billRequests";
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

    const { requestId } = (await request.json()) as { requestId: string };
    // Escopada por restaurant.id — proteção contra IDOR entre inquilinos.
    await closeBillRequest(restaurant.id, requestId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
