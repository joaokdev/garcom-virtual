import { NextResponse } from "next/server";
import { z } from "zod";
import { getRestaurantBySlug } from "@/lib/db/repositories/restaurants";
import { updateProduct, setProductAvailability, deleteProduct } from "@/lib/db/repositories/admin";
import { hasValidSession } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-handler";
import { productInputSchema } from "@/lib/validation";

interface Params {
  params: Promise<{ id: string }>;
}

const availabilityOnlySchema = z.object({ isAvailable: z.boolean() });

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

    const rawBody = await request.json();

    // Alternância rápida de disponibilidade: corpo enxuto, sem o restante do formulário.
    if (Object.keys(rawBody).length === 1 && "isAvailable" in rawBody) {
      const { isAvailable } = availabilityOnlySchema.parse(rawBody);
      await setProductAvailability(restaurant.id, id, isAvailable);
      return NextResponse.json({ ok: true });
    }

    const body = productInputSchema.parse(rawBody);
    await updateProduct(restaurant.id, id, body);
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

    await deleteProduct(restaurant.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
