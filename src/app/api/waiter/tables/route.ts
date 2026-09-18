import { NextResponse } from "next/server";
import { z } from "zod";
import { getRestaurantBySlug, listTablesForRestaurant, assumeTable, releaseTable } from "@/lib/db/repositories/restaurants";
import { getWaiterAppUser } from "@/lib/user-auth";
import { handleApiError } from "@/lib/api-handler";

/** Lista as mesas do restaurante com quem (se alguém) as assumiu. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") ?? "";
    const restaurant = await getRestaurantBySlug(slug);
    if (!restaurant) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

    const user = await getWaiterAppUser(restaurant.id);
    if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const tables = await listTablesForRestaurant(restaurant.id);
    return NextResponse.json({
      tables: tables.map((t) => ({
        id: t.id,
        label: t.label,
        assumedByMe: user.role === "waiter" && t.assumedByWaiterId === user.id,
        assumedByOther: t.assumedByWaiterId !== null && t.assumedByWaiterId !== user.id,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const bodySchema = z.object({
  tableId: z.string().min(1),
  action: z.enum(["assume", "release"]),
});

/** Garçom assume ou libera uma mesa manualmente — define a quem os próximos pedidos serão atribuídos. */
export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") ?? "";
    const restaurant = await getRestaurantBySlug(slug);
    if (!restaurant) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

    const user = await getWaiterAppUser(restaurant.id);
    if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    if (user.role !== "waiter") {
      return NextResponse.json({ error: "Somente garçons assumem mesas." }, { status: 403 });
    }

    const { tableId, action } = bodySchema.parse(await request.json());

    if (action === "assume") {
      const table = await assumeTable(tableId, restaurant.id, user.id);
      if (!table) return NextResponse.json({ error: "Mesa não encontrada." }, { status: 404 });
    } else {
      const table = await releaseTable(tableId, restaurant.id);
      if (!table) return NextResponse.json({ error: "Mesa não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
