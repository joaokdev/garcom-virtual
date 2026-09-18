import { NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/db/repositories/restaurants";
import { listAdminCategories, createCategory } from "@/lib/db/repositories/admin";
import { hasValidSession } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-handler";
import { categoryNameSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") ?? "";
    const restaurant = await getRestaurantBySlug(slug);
    if (!restaurant) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    if (!(await hasValidSession(restaurant.id, "admin"))) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
    return NextResponse.json({ categories: await listAdminCategories(restaurant.id) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") ?? "";
    const restaurant = await getRestaurantBySlug(slug);
    if (!restaurant) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    if (!(await hasValidSession(restaurant.id, "admin"))) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const body = categoryNameSchema.parse(await request.json());
    const category = await createCategory(restaurant.id, body.name);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
