import { NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/db/repositories/restaurants";
import { getFinancialSummary, listOrdersForFinancial } from "@/lib/db/repositories/financial";
import { hasValidSession } from "@/lib/auth-guard";
import { handleApiError } from "@/lib/api-handler";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") ?? "";
    const mode = searchParams.get("mode") ?? "summary";
    const dateFrom = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const dateTo = searchParams.get("to") ?? dateFrom;

    const restaurant = await getRestaurantBySlug(slug);
    if (!restaurant) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

    if (!(await hasValidSession(restaurant.id, "financial"))) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    if (mode === "orders") {
      const orders = await listOrdersForFinancial(restaurant.id, dateFrom, dateTo);
      return NextResponse.json({ orders });
    }

    const summary = await getFinancialSummary(restaurant.id, dateFrom, dateTo);
    return NextResponse.json({ summary });
  } catch (error) {
    return handleApiError(error);
  }
}
