import { pbkdf2Sync, randomBytes, timingSafeEqual, createHash, randomUUID } from "node:crypto";

/**
 * Gera um hash seguro da senha com PBKDF2-SHA512 + salt aleatório.
 * Usa timing-safe compare para evitar timing attacks na verificação.
 * Zero dependências externas — Node.js built-in crypto apenas.
 *
 * Também é usada para os PINs operacionais (cozinha/financeiro/admin) —
 * um PIN é apenas uma senha curta, e não há razão para armazená-lo em
 * texto plano no banco. A mesma função serve para os dois casos.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  return `pbkdf2:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "pbkdf2") return false;
  const [, salt, expectedHash] = parts as [string, string, string];

  const computedHash = pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");

  // Comparação em tempo constante — protege contra timing attacks
  const a = Buffer.from(computedHash, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Tokens de sessão
// ---------------------------------------------------------------------------
// PBKDF2 é intencionalmente lento (é o ponto, contra brute-force de senha).
// Tokens de sessão já nascem com ~256 bits de entropia aleatória — não
// precisam (nem devem) de uma KDF lenta. O que queremos aqui é apenas não
// guardar o valor literal do cookie no banco: se o banco vazar, os cookies
// de sessão de todo mundo não devem virar acesso válido imediato. Por isso
// guardamos só o hash (SHA-256, rápido) do token, e comparamos em tempo
// constante no momento da validação.

/** Gera um token de sessão opaco e imprevisível (256 bits). */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Hash determinístico (SHA-256) de um token, para armazenar/consultar no banco. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Compara dois hashes de token em tempo constante. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export { randomUUID };
