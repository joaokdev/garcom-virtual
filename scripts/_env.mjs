// Carrega variáveis de ".env" para process.env, sem depender de nenhuma
// dependência externa nem de sintaxe de shell (funciona igual em
// iniciar.sh e iniciar.bat). Variáveis já definidas no ambiente real
// (Docker, Railway, etc.) sempre têm prioridade sobre o arquivo ".env".
import { existsSync, readFileSync } from "node:fs";

const envPath = new URL("../.env", import.meta.url);
if (existsSync(envPath)) {
  for (const rawLine of readFileSync(envPath, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.trim().replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
