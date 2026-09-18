import { NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/db/repositories/restaurants";
import { swapCategoryPosition } from "@/lib/db/repositories/admin";
import { hasValidSession } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-handler";
import { categoryReorderSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") ?? "";
    const restaurant = await getRestaurantBySlug(slug);
    if (!restaurant) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    if (!(await hasValidSession(restaurant.id, "admin"))) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const body = categoryReorderSchema.parse(await request.json());
    await swapCategoryPosition(restaurant.id, body.categoryId, body.direction);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
