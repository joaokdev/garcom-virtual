import { NextResponse } from "next/server";
import { z } from "zod";
import { loginUser, logoutUser } from "@/lib/user-auth";
import { handleApiError, getClientIp } from "@/lib/api-handler";
import { enforceRateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  username: z.string().min(1).max(60),
  password: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  try {
    // Trava por identidade (username) já existe em loginUser(), mas sozinha
    // não impede alguém de tentar MUITOS usernames diferentes rapidamente
    // a partir do mesmo IP. Este limite por IP fecha essa lacuna.
    await enforceRateLimit(`login-ip:${getClientIp(request)}`, 20, 60);

    const body = loginSchema.parse(await request.json());
    const result = await loginUser(body.username, body.password);

    if (!result.user) {
      if (result.lockedUntil) {
        return NextResponse.json(
          { error: "Muitas tentativas incorretas. Tente novamente em alguns minutos." },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
    }

    const { user } = result;

    // Retorna dados para o cliente saber para onde redirecionar
    return NextResponse.json({
      role: user.role,
      restaurantId: user.restaurantId,
      displayName: user.displayName,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    await logoutUser();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
