import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/user-auth";
import { createTable, deactivateTable } from "@/lib/db/repositories/restaurants";
import { handleApiError } from "@/lib/api-handler";

function canManage(currentUser: { role: string; restaurantId?: string | null }, restaurantId: string) {
  return currentUser.role === "superadmin" ||
    (currentUser.role === "manager" && currentUser.restaurantId === restaurantId);
}

const createSchema = z.object({
  label: z.string().min(1).max(40),
  capacity: z.number().int().min(1).max(50),
});

/** Cria uma nova mesa (gera o QR code automaticamente). */
export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId") ?? "";
    if (!canManage(currentUser, restaurantId)) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const body = createSchema.parse(await request.json());
    const table = await createTable(restaurantId, body.label, body.capacity);
    return NextResponse.json({ table }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

const deleteSchema = z.object({ tableId: z.string().min(1) });

/** Remove uma mesa (soft delete — não apaga o histórico de pedidos já feitos nela). */
export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId") ?? "";
    if (!canManage(currentUser, restaurantId)) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const { tableId } = deleteSchema.parse(await request.json());
    const removed = await deactivateTable(tableId, restaurantId);
    if (!removed) return NextResponse.json({ error: "Mesa não encontrada." }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
