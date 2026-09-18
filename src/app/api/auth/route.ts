import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getRestaurantBySlug } from "@/lib/db/repositories/restaurants";
import { verifyPin, createSession, deleteSession } from "@/lib/db/repositories/auth";
import type { SessionType } from "@/lib/db/repositories/auth";
import { getClientIp, handleApiError } from "@/lib/api-handler";
import { enforceRateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  slug: z.string().min(1),
  pin: z.string().min(1).max(20),
  type: z.enum(["kitchen", "financial", "waiter", "admin"]),
});

function cookieName(restaurantId: string, type: SessionType) {
  return `comanda-${type}-${restaurantId}`;
}

export async function POST(request: Request) {
  try {
    // Trava por identidade (restaurante+tipo de PIN) já existe em
    // verifyPin(), mas sozinha não impede alguém de varrer MUITOS
    // restaurantes/slugs rapidamente a partir do mesmo IP. Este limite
    // por IP fecha essa lacuna.
    await enforceRateLimit(`pin-login-ip:${getClientIp(request)}`, 20, 60);

    const body = loginSchema.parse(await request.json());
    const restaurant = await getRestaurantBySlug(body.slug);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurante não encontrado." }, { status: 404 });
    }

    const result = await verifyPin(restaurant.id, body.pin, body.type);
    if (!result.ok) {
      if (result.lockedUntil) {
        return NextResponse.json(
          { error: "Muitas tentativas incorretas. Tente novamente em alguns minutos." },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: "PIN incorreto." }, { status: 401 });
    }

    const token = await createSession(restaurant.id, body.type);
    const cookieStore = await cookies();
    cookieStore.set(cookieName(restaurant.id, body.type), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 horas
      path: "/",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug") ?? "";
    const type = (searchParams.get("type") ?? "kitchen") as SessionType;
    const restaurant = await getRestaurantBySlug(slug);
    if (!restaurant) return NextResponse.json({ ok: true });

    const cookieStore = await cookies();
    const session = cookieStore.get(cookieName(restaurant.id, type));
    if (session?.value) await deleteSession(session.value);

    cookieStore.delete(cookieName(restaurant.id, type));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
