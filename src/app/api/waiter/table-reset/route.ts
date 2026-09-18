import { NextResponse } from "next/server";
import { getRestaurantBySlug } from "@/lib/db/repositories/restaurants";
import { closeBillRequestsForTable } from "@/lib/db/repositories/billRequests";
import { getWaiterAppUser } from "@/lib/user-auth";
import { handleApiError } from "@/lib/api-handler";

/**
 * Fecha a conta de uma mesa e registra a hora de liberação.
 * Chamado pelo app do Garçom ao confirmar pagamento.
 *
 * A sessão de cliente no browser (nome+CPF) é gerenciada pelo frontend
 * via clearTableSession() — este endpoint cuida do lado do servidor
 * (fecha o bill_request e permite que o waiter dashboard pare de exibir a mesa).
 */
export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") ?? "";
    const restaurant = await getRestaurantBySlug(slug);
    if (!restaurant) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

    if (!(await getWaiterAppUser(restaurant.id))) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { tableId } = (await request.json()) as { tableId: string };
    if (!tableId) return NextResponse.json({ error: "tableId é obrigatório." }, { status: 422 });

    const closed = await closeBillRequestsForTable(restaurant.id, tableId);
    return NextResponse.json({ ok: true, closed, message: "Mesa liberada." });
  } catch (error) {
    return handleApiError(error);
  }
}
