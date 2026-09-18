import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

/**
 * Centraliza o tratamento de erros das rotas de API: nunca expõe detalhes
 * internos ao cliente, sempre registra o erro real no log do servidor.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Dados enviados são inválidos." },
      { status: 422 }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status: error.statusCode }
    );
  }

  console.error("[API] Erro inesperado:", error);
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message: "Algo deu errado. Tente novamente." },
    { status: 500 }
  );
}

export function getDeviceId(request: Request): string {
  const deviceId = request.headers.get("x-device-id");
  if (!deviceId || deviceId.length < 8 || deviceId.length > 100) {
    throw new AppError("Dispositivo não identificado.", 400, "MISSING_DEVICE_ID");
  }
  return deviceId;
}

/**
 * IP do requisitante, para uso em rate limiting de rotas sensíveis (login).
 * Atrás de um proxy/load balancer (Railway, Vercel etc.) o IP real vem no
 * header "x-forwarded-for" (primeiro da lista); em ambiente local, cai no
 * fallback "local" — ainda seguro, pois o bucket combina IP + rota.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "local";
}
