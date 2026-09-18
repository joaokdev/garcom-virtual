import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/user-auth";
import { updateUser, deleteUser, getUserById } from "@/lib/db/repositories/users";
import { handleApiError } from "@/lib/api-handler";

interface Params { params: Promise<{ id: string }> }

async function checkAccess(restaurantId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const isSuperadmin = user.role === "superadmin";
  const isRestaurantManager = user.role === "manager" && user.restaurantId === restaurantId;
  if (isSuperadmin || isRestaurantManager) return user;
  return null;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId") ?? "";
    if (!await checkAccess(restaurantId)) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    // Confere que o alvo é de fato um garçom deste restaurante — sem isso,
    // um gerente de um restaurante poderia alterar usuários de outro
    // restaurante só sabendo o ID (IDOR).
    const target = await getUserById(id);
    if (!target || target.restaurantId !== restaurantId || target.role !== "waiter") {
      return NextResponse.json({ error: "Garçom não encontrado." }, { status: 404 });
    }

    const body = z.object({
      displayName: z.string().min(2).max(80).optional(),
      password: z.string().min(4).max(100).optional(),
      isActive: z.boolean().optional(),
      commissionPct: z.number().min(0).max(100).optional(),
    }).parse(await req.json());

    await updateUser(id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId") ?? "";
    if (!await checkAccess(restaurantId)) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

    const waiter = await getUserById(id);
    if (!waiter || waiter.restaurantId !== restaurantId || waiter.role !== "waiter") {
      return NextResponse.json({ error: "Garçom não encontrado." }, { status: 404 });
    }

    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
