// Derruba todas as tabelas da aplicação e reaplica o schema do zero.
// Uso: npm run db:reset (chama este script e depois npm run db:seed).
import "./_env.mjs";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("[reset-db] DATABASE_URL não definida.");
  process.exit(1);
}

const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
const ssl = isLocal ? false : { rejectUnauthorized: false };

// Este script APAGA TODAS AS TABELAS (DROP ... CASCADE) — é destrutivo e
// irreversível. Recusa rodar contra qualquer banco que não pareça local,
// a menos que --force seja passado explicitamente, para evitar que um
// "npm run db:reset" acidental (ex.: variável DATABASE_URL de produção
// vazada para o ambiente local) apague dados reais de restaurantes.
const forced = process.argv.includes("--force");
if (!isLocal && !forced) {
  console.error("");
  console.error("[reset-db] ⛔ RECUSADO: DATABASE_URL não parece ser um banco local.");
  console.error("[reset-db]    Este script APAGA TODAS AS TABELAS. Se você tem CERTEZA");
  console.error("[reset-db]    de que quer apagar este banco, rode de novo com:");
  console.error("[reset-db]    npm run db:reset -- --force");
  console.error("");
  process.exit(1);
}

const client = new pg.Client({ connectionString, ssl });

const TABLES = [
  "order_item_choices", "order_items", "orders",
  "item_recommendations", "item_option_choices", "item_option_groups",
  "menu_items", "categories", "waiter_calls", "bill_requests", "feedback",
  "auth_sessions", "auth_attempts", "users", "restaurant_tables", "restaurants",
];

async function main() {
  await client.connect();
  console.log("[reset-db] Removendo tabelas existentes...");
  await client.query(`DROP TABLE IF EXISTS ${TABLES.join(", ")} CASCADE`);
  console.log("[reset-db] Concluído. Rode: npm run db:setup && npm run db:seed");
}

main()
  .catch((err) => {
    console.error("[reset-db] Falha:", err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
