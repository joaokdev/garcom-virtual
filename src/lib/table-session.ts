/**
 * Gerenciamento de sessão de cliente por mesa.
 *
 * Problema que resolve: sem isso, o localStorage de carrinho e o deviceId
 * persistem entre clientes diferentes na mesma mesa/tablet. Cliente A pede
 * algo, sai. Cliente B senta, abre o QR Code — e vê o carrinho e histórico
 * do Cliente A.
 *
 * Solução: cada cliente recebe um sessionId único ao se identificar (nome +
 * CPF). O carrinho e o deviceId são vinculados a esse sessionId. Quando o
 * garçom fecha a conta, ele dispara o endpoint de reset da mesa, que invalida
 * a sessão atual. O próximo cliente que abrir o QR verá a tela de entrada.
 */

export interface TableSession {
  sessionId: string;    // UUID único — chave do carrinho e deviceId dos pedidos
  customerName: string;
  cpf: string;          // formatado: "000.000.000-00"
  tableId: string;
  restaurantId: string;
  startedAt: string;    // ISO 8601
}

function storageKey(restaurantId: string, tableId: string): string {
  return `comanda:session:${restaurantId}:${tableId}`;
}

export function getTableSession(
  restaurantId: string,
  tableId: string
): TableSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(restaurantId, tableId));
    if (!raw) return null;
    return JSON.parse(raw) as TableSession;
  } catch {
    return null;
  }
}

export function createTableSession(
  restaurantId: string,
  tableId: string,
  customerName: string,
  cpf: string
): TableSession {
  const session: TableSession = {
    sessionId: crypto.randomUUID(),
    customerName,
    cpf,
    tableId,
    restaurantId,
    startedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey(restaurantId, tableId), JSON.stringify(session));
  }

  return session;
}

export function clearTableSession(restaurantId: string, tableId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(restaurantId, tableId));
}

// ── Validação de CPF (algoritmo oficial da Receita Federal) ───────────────

export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function validateCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;

  // Rejeita sequências iguais (ex: 111.111.111-11)
  if (/^(\d)\1+$/.test(digits)) return false;

  function calcDigit(slice: string, factor: number): number {
    let sum = 0;
    for (const d of slice) {
      sum += parseInt(d, 10) * factor--;
    }
    const rem = (sum * 10) % 11;
    return rem >= 10 ? 0 : rem;
  }

  const d1 = calcDigit(digits.slice(0, 9), 10);
  if (d1 !== parseInt(digits[9]!, 10)) return false;

  const d2 = calcDigit(digits.slice(0, 10), 11);
  return d2 === parseInt(digits[10]!, 10);
}
