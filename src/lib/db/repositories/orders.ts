import { db, withTransaction, type DbExecutor } from "@/lib/db/client";
import { newId } from "@/lib/id";
import { ValidationError, NotFoundError } from "@/lib/errors";
import type { OrderRecord, OrderItemRecord, OrderStatus } from "@/types";

export interface CreateOrderChoiceInput {
  groupId: string;
  choiceId: string;
}

export interface CreateOrderItemInput {
  menuItemId: string;
  quantity: number;
  notes?: string;
  selectedChoices: CreateOrderChoiceInput[];
}

export interface CreateOrderInput {
  restaurantId: string;
  tableId: string;
  deviceId: string;
  notes?: string;
  items: CreateOrderItemInput[];
}

/**
 * Incrementa e retorna, de forma atômica, o contador de comandas do dia
 * para este restaurante. O ON CONFLICT DO UPDATE faz o Postgres travar a
 * linha do dia entre a leitura e a escrita, então chamadas concorrentes
 * (duas comandas abertas ao mesmo tempo) são serializadas pelo próprio
 * banco em vez de correrem o risco de ler o mesmo valor "antigo".
 */
async function nextTicketNumber(tx: DbExecutor, restaurantId: string): Promise<number> {
  const rows = await tx.query<{ counter: number }>(
    `INSERT INTO daily_ticket_counters (restaurant_id, ticket_date, counter)
     VALUES ($1, now()::date, 1)
     ON CONFLICT (restaurant_id, ticket_date)
     DO UPDATE SET counter = daily_ticket_counters.counter + 1
     RETURNING counter`,
    [restaurantId]
  );
  const counter = rows[0]?.counter;
  if (counter === undefined) {
    // Não deveria acontecer (INSERT ... RETURNING sempre retorna 1 linha),
    // mas falhar alto aqui é melhor que gravar um pedido com ticket_number
    // inválido/undefined.
    throw new Error("Falha ao gerar número da comanda.");
  }
  return counter;
}

/** name_i18n/description_i18n vêm como objeto (JSONB já desserializado pelo driver). */
function ptBR(raw: unknown, fallback: string): string {
  if (raw && typeof raw === "object") {
    const value = (raw as Record<string, string>)["pt-BR"];
    if (value) return value;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.["pt-BR"]) return parsed["pt-BR"];
    } catch {
      /* ignore */
    }
  }
  return fallback;
}

/**
 * Cria um pedido validando, no servidor, que: o item existe, pertence ao
 * restaurante, está disponível, e que cada opção selecionada de fato
 * pertence ao item e respeita as regras (obrigatório, min/max) do grupo.
 * Preços nunca são confiados ao cliente — são recalculados aqui a partir
 * do banco de dados.
 */
export async function createOrder(input: CreateOrderInput): Promise<OrderRecord> {
  if (input.items.length === 0) {
    throw new ValidationError("O pedido precisa ter pelo menos um item.");
  }

  return withTransaction(async (tx) => {
    let subtotalCents = 0;
    const preparedItems: {
      menuItemId: string;
      nameSnapshot: string;
      quantity: number;
      unitPriceCents: number;
      notes: string | null;
      choices: { nameSnapshot: string; priceDeltaCents: number }[];
    }[] = [];

    for (const item of input.items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
        throw new ValidationError("Quantidade inválida para um dos itens.");
      }

      const itemRows = await tx.query(
        "SELECT * FROM menu_items WHERE id = $1 AND restaurant_id = $2 AND is_available = true",
        [item.menuItemId, input.restaurantId]
      );
      const itemRow = itemRows[0];
      if (!itemRow) {
        throw new ValidationError("Um dos itens do pedido não está mais disponível.");
      }

      const name = ptBR(itemRow.name_i18n, itemRow.id as string);
      let unitPriceCents = itemRow.price_cents as number;

      const groupRows = await tx.query(
        "SELECT * FROM item_option_groups WHERE menu_item_id = $1",
        [itemRow.id]
      );
      const choiceRecords: { nameSnapshot: string; priceDeltaCents: number }[] = [];

      for (const group of groupRows) {
        const selectedForGroup = item.selectedChoices.filter((c) => c.groupId === group.id);

        if (group.is_required && selectedForGroup.length < (group.min_select as number)) {
          throw new ValidationError(
            `Selecione as opções obrigatórias de "${ptBR(group.name_i18n, "")}".`
          );
        }
        if (selectedForGroup.length > (group.max_select as number)) {
          throw new ValidationError(
            `Número de opções selecionadas excede o permitido em "${ptBR(group.name_i18n, "")}".`
          );
        }

        for (const sel of selectedForGroup) {
          const choiceRows = await tx.query(
            "SELECT * FROM item_option_choices WHERE id = $1 AND option_group_id = $2",
            [sel.choiceId, group.id]
          );
          const choiceRow = choiceRows[0];
          if (!choiceRow) {
            throw new ValidationError("Uma das opções selecionadas é inválida.");
          }
          const choiceName = ptBR(choiceRow.name_i18n, choiceRow.id as string);
          const priceDelta = choiceRow.price_delta_cents as number;
          unitPriceCents += priceDelta;
          choiceRecords.push({ nameSnapshot: choiceName, priceDeltaCents: priceDelta });
        }
      }

      subtotalCents += unitPriceCents * item.quantity;
      preparedItems.push({
        menuItemId: itemRow.id as string,
        nameSnapshot: name,
        quantity: item.quantity,
        unitPriceCents,
        notes: item.notes?.trim() || null,
        choices: choiceRecords,
      });
    }

    // Número de comanda do dia, por restaurante — via contador atômico
    // (evita duas comandas concorrentes nascerem com o mesmo número; ver
    // comentário de daily_ticket_counters no schema.sql).
    const ticketNumber = await nextTicketNumber(tx, input.restaurantId);

    // Confere que a mesa de fato pertence a este restaurante (nunca confie
    // no par restaurantId/tableId vindo do cliente sem checar) — e de
    // quebra, já aproveita pra saber se algum garçom assumiu a mesa.
    const assumedRows = await tx.query<{ assumed_by_waiter_id: string | null }>(
      "SELECT assumed_by_waiter_id FROM restaurant_tables WHERE id = $1 AND restaurant_id = $2",
      [input.tableId, input.restaurantId]
    );
    if (!assumedRows[0]) {
      throw new ValidationError("Mesa inválida para este restaurante.");
    }
    const waiterId = assumedRows[0].assumed_by_waiter_id ?? null;

    const orderId = newId("order");
    const now = new Date().toISOString();

    await tx.query(
      `INSERT INTO orders (id, restaurant_id, table_id, device_id, ticket_number, status, notes, subtotal_cents, waiter_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'received', $6, $7, $8, $9, $10)`,
      [
        orderId,
        input.restaurantId,
        input.tableId,
        input.deviceId,
        ticketNumber,
        input.notes?.trim() || null,
        subtotalCents,
        waiterId,
        now,
        now,
      ]
    );

    const itemRecords: OrderItemRecord[] = [];

    for (const prepared of preparedItems) {
      const orderItemId = newId("oi");
      await tx.query(
        `INSERT INTO order_items (id, order_id, menu_item_id, name_snapshot, quantity, unit_price_cents, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          orderItemId,
          orderId,
          prepared.menuItemId,
          prepared.nameSnapshot,
          prepared.quantity,
          prepared.unitPriceCents,
          prepared.notes,
          now,
        ]
      );

      const choiceRecords = [];
      for (const c of prepared.choices) {
        const choiceId = newId("oic");
        await tx.query(
          `INSERT INTO order_item_choices (id, order_item_id, name_snapshot, price_delta_cents)
           VALUES ($1, $2, $3, $4)`,
          [choiceId, orderItemId, c.nameSnapshot, c.priceDeltaCents]
        );
        choiceRecords.push({ id: choiceId, nameSnapshot: c.nameSnapshot, priceDeltaCents: c.priceDeltaCents });
      }

      itemRecords.push({
        id: orderItemId,
        menuItemId: prepared.menuItemId,
        nameSnapshot: prepared.nameSnapshot,
        quantity: prepared.quantity,
        unitPriceCents: prepared.unitPriceCents,
        notes: prepared.notes,
        choices: choiceRecords,
      });
    }

    const tableRows = await tx.query<{ label: string }>(
      "SELECT label FROM restaurant_tables WHERE id = $1",
      [input.tableId]
    );

    return {
      id: orderId,
      restaurantId: input.restaurantId,
      tableId: input.tableId,
      tableLabel: tableRows[0]?.label ?? "",
      deviceId: input.deviceId,
      ticketNumber,
      status: "received",
      notes: input.notes?.trim() || null,
      subtotalCents,
      waiterId,
      createdAt: now,
      updatedAt: now,
      items: itemRecords,
    };
  });
}

async function loadOrderItems(orderId: string, tx: DbExecutor = db()): Promise<OrderItemRecord[]> {
  const itemRows = await tx.query(
    "SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC",
    [orderId]
  );

  return Promise.all(
    itemRows.map(async (r) => {
      const choiceRows = await tx.query(
        "SELECT * FROM order_item_choices WHERE order_item_id = $1 ORDER BY created_at ASC",
        [r.id]
      );
      return {
        id: r.id as string,
        menuItemId: r.menu_item_id as string,
        nameSnapshot: r.name_snapshot as string,
        quantity: r.quantity as number,
        unitPriceCents: r.unit_price_cents as number,
        notes: (r.notes as string | null) ?? null,
        choices: choiceRows.map((c) => ({
          id: c.id as string,
          nameSnapshot: c.name_snapshot as string,
          priceDeltaCents: c.price_delta_cents as number,
        })),
      };
    })
  );
}

async function rowToOrderRecord(row: Record<string, unknown>): Promise<OrderRecord> {
  const tableId = row.table_id as string;
  const tableRows = await db().query<{ label: string }>(
    "SELECT label FROM restaurant_tables WHERE id = $1",
    [tableId]
  );

  return {
    id: row.id as string,
    restaurantId: row.restaurant_id as string,
    tableId,
    tableLabel: tableRows[0]?.label ?? "",
    deviceId: row.device_id as string,
    ticketNumber: row.ticket_number as number,
    status: row.status as OrderStatus,
    notes: (row.notes as string | null) ?? null,
    subtotalCents: row.subtotal_cents as number,
    waiterId: (row.waiter_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    items: await loadOrderItems(row.id as string),
  };
}

export async function getOrderById(orderId: string): Promise<OrderRecord | null> {
  const rows = await db().query("SELECT * FROM orders WHERE id = $1", [orderId]);
  return rows[0] ? rowToOrderRecord(rows[0]) : null;
}

/** Histórico de pedidos de um dispositivo (cliente) em um restaurante. */
export async function listOrdersByDevice(
  restaurantId: string,
  deviceId: string,
  limit = 30
): Promise<OrderRecord[]> {
  const rows = await db().query(
    `SELECT * FROM orders WHERE restaurant_id = $1 AND device_id = $2
     ORDER BY created_at DESC LIMIT $3`,
    [restaurantId, deviceId, limit]
  );
  return Promise.all(rows.map((r) => rowToOrderRecord(r)));
}

/** Pedidos ativos (não entregues/cancelados) da mesa atual — para acompanhar status. */
export async function listActiveOrdersForTable(
  restaurantId: string,
  tableId: string,
  deviceId: string
): Promise<OrderRecord[]> {
  const rows = await db().query(
    `SELECT * FROM orders
     WHERE restaurant_id = $1 AND table_id = $2 AND device_id = $3
     AND status NOT IN ('delivered', 'cancelled')
     ORDER BY created_at ASC`,
    [restaurantId, tableId, deviceId]
  );
  return Promise.all(rows.map((r) => rowToOrderRecord(r)));
}

/**
 * Atualiza o status do pedido. Usada pelos painéis de Cozinha/Garçom;
 * não é exposta por nenhuma rota pública do módulo Cliente.
 *
 * Escopada por restaurantId: sem isso, a equipe autenticada de UM
 * restaurante poderia alterar pedidos de OUTRO restaurante caso descobrisse
 * o id do pedido (falha de autorização entre inquilinos / IDOR).
 */
export async function updateOrderStatus(
  restaurantId: string,
  orderId: string,
  status: OrderStatus
): Promise<void> {
  const result = await db().query(
    "UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3 AND restaurant_id = $4 RETURNING id",
    [status, new Date().toISOString(), orderId, restaurantId]
  );
  if (result.length === 0) {
    throw new NotFoundError("Pedido não encontrado.");
  }
}

export interface KitchenOrder {
  id: string;
  ticketNumber: number;
  tableLabel: string;
  status: string;
  notes: string | null;
  createdAt: string;
  items: { name: string; quantity: number; notes: string | null; choices: string[] }[];
}

/** Pedidos ativos para o painel da cozinha, ordenados por tempo de chegada. */
export async function listKitchenOrders(restaurantId: string): Promise<KitchenOrder[]> {
  const rows = await db().query<{
    id: string;
    ticket_number: number;
    status: string;
    notes: string | null;
    created_at: string;
    table_label: string;
  }>(
    `SELECT o.id, o.ticket_number, o.status, o.notes, o.created_at,
            rt.label AS table_label
     FROM orders o
     JOIN restaurant_tables rt ON rt.id = o.table_id
     WHERE o.restaurant_id = $1
       AND o.status IN ('received','preparing','ready')
     ORDER BY o.created_at ASC`,
    [restaurantId]
  );

  return Promise.all(
    rows.map(async (r) => {
      const itemRows = await db().query<{
        name_snapshot: string;
        quantity: number;
        notes: string | null;
        id: string;
      }>(
        `SELECT oi.name_snapshot, oi.quantity, oi.notes, oi.id
         FROM order_items oi WHERE oi.order_id = $1 ORDER BY oi.created_at ASC`,
        [r.id]
      );

      const items = await Promise.all(
        itemRows.map(async (item) => {
          const choiceRows = await db().query<{ name_snapshot: string }>(
            "SELECT name_snapshot FROM order_item_choices WHERE order_item_id = $1 ORDER BY created_at ASC",
            [item.id]
          );
          return {
            name: item.name_snapshot,
            quantity: item.quantity,
            notes: item.notes,
            choices: choiceRows.map((c) => c.name_snapshot),
          };
        })
      );

      return {
        id: r.id,
        ticketNumber: r.ticket_number,
        tableLabel: r.table_label,
        status: r.status,
        notes: r.notes,
        createdAt: r.created_at,
        items,
      };
    })
  );
}
