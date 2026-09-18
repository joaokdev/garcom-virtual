import { NextResponse } from "next/server";
import { billRequestSchema } from "@/lib/validation";
import { handleApiError, getDeviceId } from "@/lib/api-handler";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createBillRequest, getPendingBillRequestForTable } from "@/lib/db/repositories/billRequests";
import { getTableById } from "@/lib/db/repositories/restaurants";
import { ValidationError } from "@/lib/errors";

export async function POST(request: Request) {
  try {
    const deviceId = getDeviceId(request);
    await enforceRateLimit(`bill-request:${deviceId}`, 10, 60); // 10/min por dispositivo
    const body = billRequestSchema.parse(await request.json());

    // Nunca confia no par restaurantId/tableId vindo do cliente sem checar.
    const table = await getTableById(body.tableId);
    if (!table || table.restaurantId !== body.restaurantId) {
      throw new ValidationError("Mesa inválida para este restaurante.");
    }

    const existing = await getPendingBillRequestForTable(body.tableId);
    if (existing) {
      return NextResponse.json({ request: existing, alreadyExisted: true });
    }

    const paymentPreference =
      body.paymentPreference && body.paymentPreference !== "none" ? body.paymentPreference : undefined;

    const billRequest = await createBillRequest(body.restaurantId, body.tableId, deviceId, paymentPreference);
    return NextResponse.json({ request: billRequest, alreadyExisted: false }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
