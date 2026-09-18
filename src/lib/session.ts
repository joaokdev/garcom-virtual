import { getTableSession } from "@/lib/table-session";

const DEVICE_ID_KEY = "comanda_device_id";

/**
 * Retorna o identificador do dispositivo para a requisição atual.
 *
 * Se houver uma sessão de mesa ativa (cliente identificado por nome+CPF),
 * usa o sessionId como deviceId — garantindo que os pedidos ficam vinculados
 * à sessão daquele cliente específico, não ao tablet.
 *
 * Fallback: ID persistente do browser (comportamento anterior, usado fora
 * do contexto de mesa ou como segurança se a sessão não existir).
 */
export function getDeviceId(restaurantId?: string, tableId?: string): string {
  if (typeof window === "undefined") return "server";

  // Com contexto de mesa: usa o sessionId do cliente atual
  if (restaurantId && tableId) {
    const session = getTableSession(restaurantId, tableId);
    if (session) return session.sessionId;
  }

  // Fallback: ID global do dispositivo
  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
