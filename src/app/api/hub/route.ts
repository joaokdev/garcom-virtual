import { NextResponse } from "next/server";
import { z } from "zod";
import { createRestaurant } from "@/lib/db/repositories/admin";
import { handleApiError, getClientIp } from "@/lib/api-handler";
import { enforceRateLimit } from "@/lib/rate-limit";

const createRestaurantSchema = z.object({
  masterPin: z.string().min(1),
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens."),
  tagline: z.string().max(120).default(""),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#E05C2A"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1A4D3A"),
  logoIcon: z.enum(["flame", "leaf", "coffee", "fish", "wheat"]).nullable().default(null),
  serviceFeePct: z.number().min(0).max(30).default(10),
  kitchenPin: z.string().min(4).max(20).default("1234"),
  financialPin: z.string().min(4).max(20).default("1234"),
  adminPin: z.string().min(4).max(20).default("1234"),
});

export async function POST(request: Request) {
  try {
    // Sem isso, o PIN master podia ser tentado sem limite (força bruta) —
    // esta rota cria restaurantes de verdade na plataforma inteira.
    await enforceRateLimit(`hub-master-pin:${getClientIp(request)}`, 5, 300); // 5 tentativas / 5min

    const body = createRestaurantSchema.parse(await request.json());

    // Fail closed: se a env var não estiver configurada, nunca cai num PIN
    // padrão conhecido publicamente no código-fonte — recusa a requisição.
    const masterPin = process.env.HUB_MASTER_PIN;
    if (!masterPin) {
      return NextResponse.json(
        { error: "HUB_MASTER_PIN não configurado no servidor." },
        { status: 503 }
      );
    }
    if (body.masterPin !== masterPin) {
      return NextResponse.json({ error: "PIN master incorreto." }, { status: 401 });
    }

    const restaurantId = await createRestaurant({
      name: body.name,
      slug: body.slug,
      tagline: body.tagline,
      primaryColor: body.primaryColor,
      accentColor: body.accentColor,
      logoIcon: body.logoIcon,
      serviceFeePct: body.serviceFeePct,
      kitchenPin: body.kitchenPin,
      financialPin: body.financialPin,
      adminPin: body.adminPin,
    });

    return NextResponse.json({ restaurantId, slug: body.slug }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
