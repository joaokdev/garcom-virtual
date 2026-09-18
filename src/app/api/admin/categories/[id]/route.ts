import { NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/db/repositories/restaurants";
import { renameCategory, deleteCategory } from "@/lib/db/repositories/admin";
import { hasValidSession } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-handler";
import { categoryNameSchema } from "@/lib/validation";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") ?? "";
    const restaurant = await getRestaurantBySlug(slug);
    if (!restaurant) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    if (!(await hasValidSession(restaurant.id, "admin"))) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const body = categoryNameSchema.parse(await request.json());
    await renameCategory(restaurant.id, id, body.name);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") ?? "";
    const restaurant = await getRestaurantBySlug(slug);
    if (!restaurant) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    if (!(await hasValidSession(restaurant.id, "admin"))) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    await deleteCategory(restaurant.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
