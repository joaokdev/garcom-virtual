import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/user-auth";
import { createUser } from "@/lib/db/repositories/users";
import { handleApiError } from "@/lib/api-handler";

const schema = z.object({
  displayName: z.string().min(2).max(80),
  username: z.string().min(3).max(40).regex(/^[a-z0-9._-]+$/i),
  password: z.string().min(4).max(100),
  commissionPct: z.number().min(0).max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId") ?? "";

    const isSuperadmin = currentUser.role === "superadmin";
    const isRestaurantManager =
      currentUser.role === "manager" && currentUser.restaurantId === restaurantId;
    if (!isSuperadmin && !isRestaurantManager) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
    }

    const body = schema.parse(await request.json());
    const waiter = await createUser({
      username: body.username.toLowerCase(),
      password: body.password,
      displayName: body.displayName,
      role: "waiter",
      restaurantId,
      commissionPct: body.commissionPct,
    });

    return NextResponse.json({
      waiter: {
        id: waiter.id,
        username: waiter.username,
        displayName: waiter.displayName,
        isActive: waiter.isActive,
        commissionPct: waiter.commissionPct,
      },
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
