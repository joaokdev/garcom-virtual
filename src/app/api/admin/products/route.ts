import { NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/db/repositories/restaurants";
import { listAdminProducts, createProduct } from "@/lib/db/repositories/admin";
import { hasValidSession } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-handler";
import { productInputSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") ?? "";
    const search = searchParams.get("search") ?? undefined;
    const categoryId = searchParams.get("categoryId") ?? undefined;

    const restaurant = await getRestaurantBySlug(slug);
    if (!restaurant) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    if (!(await hasValidSession(restaurant.id, "admin"))) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const products = await listAdminProducts(restaurant.id, { search, categoryId });
    return NextResponse.json({ products });
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

    const body = productInputSchema.parse(await request.json());
    const id = await createProduct(restaurant.id, body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
