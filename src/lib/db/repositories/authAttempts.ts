import { db } from "@/lib/db/client";

/**
 * Proteção genérica contra força bruta, reutilizada tanto pelo login por PIN
 * (cozinha/financeiro/admin/garçom) quanto pelo login de usuário (username +
 * senha). Uma linha por "identidade" tentando autenticar; após MAX_ATTEMPTS
 * tentativas inválidas em sequência, a identidade fica bloqueada por
 * LOCKOUT_MINUTES. Uma tentativa bem-sucedida zera o contador.
 */
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/** Retorna null se liberado, ou a data (ISO) até quando está bloqueado. */
export async function checkLock(identityKey: string): Promise<string | null> {
  const rows = await db().query<{ locked_until: string | null }>(
    "SELECT locked_until FROM auth_attempts WHERE identity_key = $1",
    [identityKey]
  );
  const lockedUntil = rows[0]?.locked_until ?? null;
  if (lockedUntil && new Date(lockedUntil) > new Date()) {
    return lockedUntil;
  }
  return null;
}

export async function registerFailure(identityKey: string): Promise<void> {
  const rows = await db().query<{ attempts: number }>(
    "SELECT attempts FROM auth_attempts WHERE identity_key = $1",
    [identityKey]
  );
  const attempts = (rows[0]?.attempts ?? 0) + 1;
  const lockedUntil =
    attempts >= MAX_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
      : null;

  await db().query(
    `INSERT INTO auth_attempts (identity_key, attempts, locked_until, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (identity_key)
     DO UPDATE SET attempts = $2, locked_until = $3, updated_at = now()`,
    [identityKey, attempts, lockedUntil]
  );
}

export async function registerSuccess(identityKey: string): Promise<void> {
  await db().query("DELETE FROM auth_attempts WHERE identity_key = $1", [identityKey]);
}
