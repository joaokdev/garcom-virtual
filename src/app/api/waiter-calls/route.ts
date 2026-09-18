import { NextResponse } from "next/server";
import { waiterCallSchema } from "@/lib/validation";
import { handleApiError, getDeviceId } from "@/lib/api-handler";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createWaiterCall, getPendingCallForTable } from "@/lib/db/repositories/waiterCalls";
import { getTableById } from "@/lib/db/repositories/restaurants";
import { ValidationError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const deviceId = getDeviceId(request);
    await enforceRateLimit(`waiter-call:${deviceId}`, 10, 60); // 10/min por dispositivo
    const body = waiterCallSchema.parse(await request.json());

    // Nunca confia no par restaurantId/tableId vindo do cliente sem checar.
    const table = await getTableById(body.tableId);
    if (!table || table.restaurantId !== body.restaurantId) {
      throw new ValidationError("Mesa inválida para este restaurante.");
    }

    const existing = await getPendingCallForTable(body.tableId);
    if (existing) {
      return NextResponse.json({ call: existing, alreadyExisted: true });
    }

    const call = await createWaiterCall(body.restaurantId, body.tableId, deviceId, body.reason);
    return NextResponse.json({ call, alreadyExisted: false }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
