import { db } from "@/lib/db/client";
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  hashSessionToken,
} from "@/lib/password";
import { checkLock, registerFailure, registerSuccess } from "@/lib/db/repositories/authAttempts";

export type SessionType = "kitchen" | "financial" | "waiter" | "admin";

const PIN_COLUMN: Record<SessionType, string> = {
  kitchen: "kitchen_pin_hash",
  waiter: "kitchen_pin_hash", // equipe de salão usa o mesmo PIN operacional da cozinha
  financial: "financial_pin_hash",
  admin: "admin_pin_hash",
};

export interface PinVerifyResult {
  ok: boolean;
  /** Presente quando bloqueado por excesso de tentativas — ISO 8601. */
  lockedUntil?: string;
}

export async function verifyPin(
  restaurantId: string,
  pin: string,
  type: SessionType
): Promise<PinVerifyResult> {
  const identityKey = `pin:${restaurantId}:${type}`;

  const lockedUntil = await checkLock(identityKey);
  if (lockedUntil) return { ok: false, lockedUntil };

  const col = PIN_COLUMN[type];
  const rows = await db().query<Record<string, string>>(
    `SELECT ${col} AS pin_hash FROM restaurants WHERE id = $1`,
    [restaurantId]
  );
  const storedHash = rows[0]?.pin_hash;
  const ok = typeof storedHash === "string" && verifyPassword(pin, storedHash);

  if (ok) {
    await registerSuccess(identityKey);
    return { ok: true };
  }

  await registerFailure(identityKey);
  return { ok: false };
}

/** Gera um hash de PIN pronto para gravar em kitchen_pin_hash/financial_pin_hash/admin_pin_hash. */
export function hashPin(pin: string): string {
  return hashPassword(pin);
}

// ---------------------------------------------------------------------------
// Sessões
// ---------------------------------------------------------------------------

/** Cria a sessão e retorna o token opaco a ser enviado ao cliente (cookie). */
export async function createSession(restaurantId: string, type: SessionType): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expires = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 horas

  await db().query(
    "INSERT INTO auth_sessions (token_hash, restaurant_id, type, created_at, expires_at) VALUES ($1, $2, $3, now(), $4)",
    [tokenHash, restaurantId, type, expires.toISOString()]
  );

  return token;
}

export async function validateSession(
  token: string,
  restaurantId: string,
  type: SessionType
): Promise<boolean> {
  const tokenHash = hashSessionToken(token);
  const rows = await db().query<{ expires_at: string }>(
    "SELECT expires_at FROM auth_sessions WHERE token_hash = $1 AND restaurant_id = $2 AND type = $3",
    [tokenHash, restaurantId, type]
  );
  const row = rows[0];
  if (!row) return false;
  return new Date(row.expires_at) > new Date();
}

export async function deleteSession(token: string): Promise<void> {
  const tokenHash = hashSessionToken(token);
  await db().query("DELETE FROM auth_sessions WHERE token_hash = $1", [tokenHash]);
}

/** Remove sessões expiradas — chamado periodicamente por scripts/ensure-db.mjs. */
export async function purgeExpiredSessions(): Promise<number> {
  const rows = await db().query("DELETE FROM auth_sessions WHERE expires_at < now() RETURNING token_hash");
  return rows.length;
}
