import { NextResponse } from "next/server";
import { getAppConfig } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getAppConfig();
  return NextResponse.json(config, { headers: { "Cache-Control": "no-store" } });
}
