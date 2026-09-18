import { Pool, type PoolClient, types } from "pg";

/**
 * Camada de acesso ao banco de dados — PostgreSQL.
 *
 * Toda a aplicação acessa o banco SOMENTE através das funções em
 * `src/lib/db/repositories/*`. Nenhum SQL solto deve existir fora desta
 * camada.
 *
 * O schema (DDL) NÃO é aplicado por este arquivo. Ele mora em um único
 * lugar — `src/lib/db/schema.sql` — e é aplicado por `scripts/ensure-db.mjs`
 * antes da aplicação subir (veja package.json → "start:prod" / "db:setup").
 * Isso evita o problema de duas cópias do schema (uma em arquivo, outra
 * embutida no bundle) precisando ser mantidas manualmente em sincronia.
 */

// PostgreSQL devolve BIGINT (ex.: resultado de COUNT(*)) como string por
// padrão, para não perder precisão em números maiores que 2^53. Nesta
// aplicação nunca teremos contagens nessa magnitude, então convertê-los
// para number aqui evita que todo repositório precise lidar com isso.
types.setTypeParser(20 /* int8/bigint */, (value: string) => parseInt(value, 10));

// O restante da aplicação foi escrito assumindo timestamps como string ISO-8601
// (era o que o SQLite devolvia). O driver "pg" por padrão converte TIMESTAMPTZ
// em objeto Date do JS — convertemos de volta para string ISO aqui, uma única
// vez, em vez de espalhar esse detalhe por todos os repositórios.
types.setTypeParser(1184 /* timestamptz */, (value: string) => new Date(value).toISOString());

// A leitura + validação de DATABASE_URL é adiada para dentro de getPool()
// (em vez de rodar no topo do módulo) de propósito: o Next.js importa este
// arquivo (transitivamente, via qualquer rota de API) durante `next build`
// para coletar metadados das páginas — nesse momento nenhuma query real é
// feita, então exigir DATABASE_URL nesse instante só quebra builds em CI/CD
// onde a variável só existe em runtime. A validação continua acontecendo
// sempre antes de qualquer conexão real ser aberta.
function resolveSsl(connectionString: string): boolean | { rejectUnauthorized: boolean } {
  if (process.env.DATABASE_SSL === "true") return { rejectUnauthorized: false };
  if (process.env.DATABASE_SSL === "false") return false;
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
  return isLocal ? false : { rejectUnauthorized: false };
}

let pool: Pool | null = null;

/** Retorna o pool de conexões singleton, criando-o na primeira chamada. */
export function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "[comanda/db] Variável de ambiente DATABASE_URL não definida. " +
        "Configure a string de conexão do PostgreSQL (veja .env.example)."
    );
  }

  const ssl = resolveSsl(connectionString);

  console.log("[comanda/db] ────────────────────────────────────────────");
  console.log("[comanda/db] NODE_ENV       :", process.env.NODE_ENV ?? "(não definido)");
  console.log("[comanda/db] DATABASE_URL   :", redact(connectionString));
  console.log("[comanda/db] SSL            :", JSON.stringify(ssl));
  console.log("[comanda/db] ────────────────────────────────────────────");

  pool = new Pool({
    connectionString,
    ssl,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  pool.on("error", (err) => {
    // Erros em clientes ociosos do pool não devem derrubar o processo.
    console.error("[comanda/db] Erro inesperado no pool de conexões:", err);
  });

  return pool;
}

function redact(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "(URL inválida)";
  }
}

/** Interface mínima e comum entre o pool e um client de transação. */
export interface DbExecutor {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<T[]>;
}

function wrap(queryable: Pool | PoolClient): DbExecutor {
  return {
    async query<T extends Record<string, unknown>>(text: string, params?: unknown[]) {
      const result = await queryable.query(text, params);
      return result.rows as T[];
    },
  };
}

/** Executor padrão (fora de transação) — uso normal em toda a aplicação. */
export function db(): DbExecutor {
  return wrap(getPool());
}

/**
 * Executa `fn` dentro de uma transação PostgreSQL real (BEGIN/COMMIT/ROLLBACK),
 * usando uma única conexão do pool. Qualquer erro lançado dentro de `fn`
 * reverte todas as alterações feitas até ali.
 */
export async function withTransaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(wrap(client));
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("[comanda/db] Falha ao reverter transação:", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

/** Encerra o pool — usado apenas em scripts (seed, testes), nunca no app Next.js. */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
