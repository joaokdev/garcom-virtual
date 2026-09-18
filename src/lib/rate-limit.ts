import { db } from "@/lib/db/client";
import { AppError } from "@/lib/errors";

/**
 * Limitação de taxa por janela fixa, guardada no banco (funciona
 * corretamente mesmo com várias instâncias do servidor rodando).
 * Lança AppError 429 quando o limite é excedido.
 */
export async function enforceRateLimit(
  bucketKey: string,
  limit: number,
  windowSeconds: number
): Promise<void> {
  const rows = await db().query<{ count: number; window_start: string }>(
    "SELECT count, window_start FROM rate_limits WHERE bucket_key = $1",
    [bucketKey]
  );
  const row = rows[0];
  const now = Date.now();
  const windowExpired = !row || now - new Date(row.window_start).getTime() > windowSeconds * 1000;

  if (windowExpired) {
    await db().query(
      `INSERT INTO rate_limits (bucket_key, count, window_start) VALUES ($1, 1, now())
       ON CONFLICT (bucket_key) DO UPDATE SET count = 1, window_start = now()`,
      [bucketKey]
    );
    return;
  }

  if (row.count >= limit) {
    throw new AppError(
      "Muitas solicitações em pouco tempo. Aguarde um instante e tente novamente.",
      429,
      "RATE_LIMITED"
    );
  }

  await db().query("UPDATE rate_limits SET count = count + 1 WHERE bucket_key = $1", [bucketKey]);
}
