import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/client";
import { hashPassword, verifyPassword } from "@/lib/password";
import { checkLock, registerFailure, registerSuccess } from "@/lib/db/repositories/authAttempts";
import { AppError } from "@/lib/errors";

export type UserRole = "superadmin" | "manager" | "waiter";

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  restaurantId: string | null;
  isActive: boolean;
  createdAt: string;
  /** Percentual de comissão do garçom (0 para manager/superadmin). */
  commissionPct: number;
}

function mapUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    username: row.username as string,
    displayName: row.display_name as string,
    role: row.role as UserRole,
    restaurantId: (row.restaurant_id as string | null) ?? null,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at as string,
    commissionPct: Number(row.commission_pct ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Criação de usuários
// ---------------------------------------------------------------------------

export async function createUser(input: {
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  restaurantId?: string;
  commissionPct?: number;
}): Promise<User> {
  const existing = await db().query("SELECT id FROM users WHERE lower(username) = lower($1)", [
    input.username,
  ]);
  if (existing[0]) {
    throw new AppError(`Usuário "${input.username}" já existe.`, 409, "USERNAME_TAKEN");
  }

  const id = `user_${randomUUID()}`;
  await db().query(
    `INSERT INTO users (id, username, password_hash, display_name, role, restaurant_id, is_active, created_at, commission_pct)
     VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)`,
    [
      id,
      input.username.toLowerCase().trim(),
      hashPassword(input.password),
      input.displayName,
      input.role,
      input.restaurantId ?? null,
      new Date().toISOString(),
      input.commissionPct ?? 0,
    ]
  );

  return (await getUserById(id))!;
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export async function getUserById(id: string): Promise<User | null> {
  const rows = await db().query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const rows = await db().query("SELECT * FROM users WHERE lower(username) = lower($1)", [username]);
  return rows[0] ? mapUser(rows[0]) : null;
}

export interface UserCredentialResult {
  user: User | null;
  lockedUntil?: string;
}

/**
 * Verifica credenciais com proteção contra força bruta (bloqueio temporário
 * após tentativas inválidas repetidas). Retorna o usuário se correto.
 */
export async function verifyUserCredentials(
  username: string,
  password: string
): Promise<UserCredentialResult> {
  const identityKey = `user:${username.toLowerCase().trim()}`;

  const lockedUntil = await checkLock(identityKey);
  if (lockedUntil) return { user: null, lockedUntil };

  const rows = await db().query(
    "SELECT * FROM users WHERE lower(username) = lower($1) AND is_active = true",
    [username]
  );
  const row = rows[0];

  const ok = !!row && verifyPassword(password, row.password_hash as string);
  if (!ok) {
    await registerFailure(identityKey);
    return { user: null };
  }

  await registerSuccess(identityKey);
  return { user: mapUser(row) };
}

/** Lista garçons de um restaurante. */
export async function listWaiters(restaurantId: string): Promise<User[]> {
  const rows = await db().query(
    "SELECT * FROM users WHERE restaurant_id = $1 AND role = 'waiter' ORDER BY display_name ASC",
    [restaurantId]
  );
  return rows.map(mapUser);
}

/** Retorna o manager de um restaurante (se existir). */
export async function getRestaurantManager(restaurantId: string): Promise<User | null> {
  const rows = await db().query(
    "SELECT * FROM users WHERE restaurant_id = $1 AND role = 'manager' LIMIT 1",
    [restaurantId]
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

// ---------------------------------------------------------------------------
// Edição e remoção
// ---------------------------------------------------------------------------

export async function updateUser(
  id: string,
  input: { displayName?: string; password?: string; isActive?: boolean; commissionPct?: number }
): Promise<void> {
  if (input.displayName !== undefined) {
    await db().query("UPDATE users SET display_name = $1 WHERE id = $2", [input.displayName, id]);
  }
  if (input.password !== undefined) {
    await db().query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      hashPassword(input.password),
      id,
    ]);
    // Trocar a senha deveria derrubar sessões existentes (ex.: conta suspeita
    // de comprometimento) — sem isso, o cookie antigo continuava valendo.
    await db().query("DELETE FROM auth_sessions WHERE type = $1", [`user:${id}`]);
  }
  if (input.isActive !== undefined) {
    await db().query("UPDATE users SET is_active = $1 WHERE id = $2", [input.isActive, id]);
    if (!input.isActive) {
      await db().query("DELETE FROM auth_sessions WHERE type = $1", [`user:${id}`]);
    }
  }
  if (input.commissionPct !== undefined) {
    await db().query("UPDATE users SET commission_pct = $1 WHERE id = $2", [
      input.commissionPct,
      id,
    ]);
  }
}

export async function deleteUser(id: string): Promise<void> {
  await db().query("DELETE FROM users WHERE id = $1", [id]);
}
