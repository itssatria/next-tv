import { NextResponse } from "next/server";
import { searchChannels } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/** Channel search across the whole directory. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  const channels = await searchChannels(query, 40);
  return NextResponse.json({ channels }, { headers: { "Cache-Control": "no-store" } });
}
