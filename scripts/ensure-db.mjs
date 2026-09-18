// Aplica o schema (schema.sql — fonte única de verdade) no PostgreSQL
// configurado via DATABASE_URL. Roda antes de "next start" em produção
// (veja package.json → "start:prod") e pode ser chamado manualmente em
// dev com `npm run db:setup`.
import "./_env.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[ensure-db] DATABASE_URL não definida. Configure a conexão com o PostgreSQL.");
  process.exit(1);
}

const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
const ssl =
  process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: false }
    : process.env.DATABASE_SSL === "false"
      ? false
      : isLocal
        ? false
        : { rejectUnauthorized: false };

const client = new pg.Client({ connectionString, ssl });

/**
 * Tenta conectar com algumas retentativas antes de desistir. Isso cobre o
 * caso comum de rodar este script logo após "docker compose up -d db":
 * o container pode responder ao "docker" antes do Postgres realmente
 * aceitar conexões (primeira subida = initdb, que demora mais). Sem isso,
 * a primeira tentativa falhava com ECONNREFUSED mesmo com o banco subindo
 * normalmente, só um pouco mais devagar.
 */
async function connectWithRetry(maxAttempts = 15, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await client.connect();
      return;
    } catch (err) {
      const isConnRefused = err && (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND");
      if (!isConnRefused || attempt === maxAttempts) throw err;
      console.log(
        `[ensure-db] PostgreSQL ainda não está aceitando conexões (tentativa ${attempt}/${maxAttempts})... aguardando.`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function main() {
  console.log("[ensure-db] Conectando ao PostgreSQL...");
  await connectWithRetry();

  const schemaPath = join(__dirname, "..", "src", "lib", "db", "schema.sql");
  const schemaSql = readFileSync(schemaPath, "utf8");

  console.log("[ensure-db] Aplicando schema.sql...");
  await client.query(schemaSql);

  // Limpa sessões expiradas — mantém a tabela pequena ao longo do tempo.
  const { rowCount } = await client.query("DELETE FROM auth_sessions WHERE expires_at < now()");
  if (rowCount > 0) {
    console.log(`[ensure-db] ${rowCount} sessão(ões) expirada(s) removida(s).`);
  }

  const { rows } = await client.query("SELECT COUNT(*)::int AS n FROM restaurants");
  console.log(`[ensure-db] Restaurantes no banco: ${rows[0].n}`);
  if (rows[0].n === 0) {
    console.warn("[ensure-db] ⚠  Banco vazio — execute: npm run db:seed");
  }

  console.log("[ensure-db] Schema OK.");
}

main()
  .catch((err) => {
    console.error("[ensure-db] Falha ao aplicar schema:", err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
