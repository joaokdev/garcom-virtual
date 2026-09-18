import { NextResponse } from "next/server";
import { feedbackSchema } from "@/lib/validation";
import { handleApiError, getDeviceId } from "@/lib/api-handler";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createFeedback } from "@/lib/db/repositories/feedback";

export async function POST(request: Request) {
  try {
    const deviceId = getDeviceId(request);
    await enforceRateLimit(`feedback:${deviceId}`, 10, 60); // 10/min por dispositivo
    const body = feedbackSchema.parse(await request.json());

    const feedback = await createFeedback(
      body.restaurantId,
      deviceId,
      body.rating,
      body.comment,
      body.tableId,
      body.orderId
    );

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
