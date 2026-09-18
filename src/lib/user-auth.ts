import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { generateSessionToken, hashSessionToken } from "@/lib/password";
import { getUserById, verifyUserCredentials, type User } from "@/lib/db/repositories/users";

const SESSION_DURATION_H = 12;

export interface LoginResult {
  user: User | null;
  lockedUntil?: string;
}

// ---------------------------------------------------------------------------
// Login e logout
// ---------------------------------------------------------------------------

export async function loginUser(username: string, password: string): Promise<LoginResult> {
  const { user, lockedUntil } = await verifyUserCredentials(username, password);
  if (!user) return { user: null, lockedUntil };

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DURATION_H * 3600 * 1000);

  await db().query(
    `INSERT INTO auth_sessions (token_hash, restaurant_id, type, created_at, expires_at)
     VALUES ($1, $2, $3, now(), $4)`,
    [
      tokenHash,
      user.restaurantId ?? null, // NULL para superadmin — não pertence a um restaurante
      `user:${user.id}`, // encoda o userId no campo type
      expires.toISOString(),
    ]
  );

  const cookieStore = await cookies();
  cookieStore.set("comanda-user-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_H * 3600,
    path: "/",
  });

  return { user };
}

export async function logoutUser(): Promise<void> {
  const cookieStore = await cookies();
  const session = cookieStore.get("comanda-user-session");
  if (session?.value) {
    await db().query("DELETE FROM auth_sessions WHERE token_hash = $1", [
      hashSessionToken(session.value),
    ]);
  }
  cookieStore.delete("comanda-user-session");
}

// ---------------------------------------------------------------------------
// Verificação de sessão (usada nas páginas protegidas)
// ---------------------------------------------------------------------------

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("comanda-user-session");
  if (!session?.value) return null;

  const tokenHash = hashSessionToken(session.value);
  const rows = await db().query<{ type: string; expires_at: string }>(
    "SELECT type, expires_at FROM auth_sessions WHERE token_hash = $1",
    [tokenHash]
  );
  const row = rows[0];

  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    await db().query("DELETE FROM auth_sessions WHERE token_hash = $1", [tokenHash]);
    return null;
  }

  // Extrai o userId do campo type (formato: "user:{id}")
  const userId = row.type.startsWith("user:") ? row.type.slice(5) : null;
  if (!userId) return null;

  const user = await getUserById(userId);
  if (!user) return null;

  // Conta desativada depois que a sessão foi criada (ex.: gerente desligou o
  // garçom): a sessão ainda não expirou, mas o acesso deve cair na hora, não
  // só no próximo login. Também limpa a sessão, pra não repetir essa consulta.
  if (!user.isActive) {
    await db().query("DELETE FROM auth_sessions WHERE token_hash = $1", [tokenHash]);
    return null;
  }

  return user;
}

/** Requer login e redireciona para /login se não autenticado. */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return user as User;
}

/** Requer login de superadmin. */
export async function requireSuperAdmin(): Promise<User> {
  const user = await requireAuth();
  if (user.role !== "superadmin") {
    const { redirect } = await import("next/navigation");
    redirect("/r/" + user.restaurantId);
  }
  return user as User;
}

/**
 * Para as rotas de API do app do garçom (dashboard, pedidos, chamados,
 * contas, liberação de mesa). Usa a mesma sessão individual de login do
 * `/garcom/[slug]`, em vez do PIN operacional compartilhado — cada ação
 * fica de fato ligada a um usuário (necessário para a comissão). Diferente
 * de requireRestaurantAccess(), nunca redireciona: rotas de API respondem
 * com JSON, então aqui devolvemos null e quem chamou decide o status.
 */
export async function getWaiterAppUser(restaurantId: string): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === "superadmin") return user;
  if (user.restaurantId === restaurantId && (user.role === "manager" || user.role === "waiter")) {
    return user;
  }
  return null;
}
