import { cookies } from "next/headers";
import { validateSession } from "@/lib/db/repositories/auth";
import type { SessionType } from "@/lib/db/repositories/auth";

/** Verifica se existe uma sessão válida de equipe (cozinha/garçom/financeiro/admin) para o restaurante. */
export async function hasValidSession(restaurantId: string, type: SessionType): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(`comanda-${type}-${restaurantId}`);
  if (!session?.value) return false;
  return validateSession(session.value, restaurantId, type);
}
