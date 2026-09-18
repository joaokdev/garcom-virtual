import { NextResponse } from "next/server";
import { handleApiError, getDeviceId } from "@/lib/api-handler";
import { getMenuForRestaurant } from "@/lib/db/repositories/menu";
import { getRecommendationsForDevice } from "@/lib/db/repositories/recommendations";

export async function GET(request: Request) {
  try {
    const deviceId = getDeviceId(request);
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "restaurantId é obrigatório." },
        { status: 422 }
      );
    }

    const menu = await getMenuForRestaurant(restaurantId);
    const items = await getRecommendationsForDevice(restaurantId, deviceId, menu);

    return NextResponse.json({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
