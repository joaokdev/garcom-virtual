import { NextResponse } from "next/server";
import { createOrderSchema } from "@/lib/validation";
import { handleApiError, getDeviceId } from "@/lib/api-handler";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  createOrder,
  listActiveOrdersForTable,
  listOrdersByDevice,
} from "@/lib/db/repositories/orders";

export async function POST(request: Request) {
  try {
    const deviceId = getDeviceId(request);
    await enforceRateLimit(`order:${deviceId}`, 20, 60); // 20 pedidos/min por dispositivo
    const body = createOrderSchema.parse(await request.json());

    const order = await createOrder({
      restaurantId: body.restaurantId,
      tableId: body.tableId,
      deviceId,
      notes: body.notes,
      items: body.items,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: Request) {
  try {
    const deviceId = getDeviceId(request);
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");
    const tableId = searchParams.get("tableId");
    const mode = searchParams.get("mode") ?? "active";

    if (!restaurantId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "restaurantId é obrigatório." },
        { status: 422 }
      );
    }

    if (mode === "history") {
      const orders = await listOrdersByDevice(restaurantId, deviceId);
      return NextResponse.json({ orders });
    }

    if (!tableId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "tableId é obrigatório para mode=active." },
        { status: 422 }
      );
    }

    const orders = await listActiveOrdersForTable(restaurantId, tableId, deviceId);
    return NextResponse.json({ orders });
  } catch (error) {
    return handleApiError(error);
  }
}
