import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await getCatalog();
  return NextResponse.json(catalog, {
    headers: { "Cache-Control": "no-store" },
  });
}
