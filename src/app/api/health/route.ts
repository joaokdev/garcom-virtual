import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";

export async function GET() {
  try {
    const rows = await db().query<{ n: number }>("SELECT COUNT(*)::int AS n FROM restaurants");

    return NextResponse.json({
      status: "ok",
      db: {
        restaurants: rows[0]?.n ?? 0,
      },
      env: {
        NODE_ENV: process.env.NODE_ENV,
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
        env: {
          NODE_ENV: process.env.NODE_ENV,
          hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        },
      },
      { status: 500 }
    );
  }
}
