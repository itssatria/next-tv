import { NextResponse } from "next/server";
import { getChannels } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/** Paginated channel list, optionally filtered by category slug or a search term. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;
  const query = searchParams.get("q") ?? undefined;
  const limit = Number(searchParams.get("limit") ?? "120");
  const offset = Number(searchParams.get("offset") ?? "0");

  const { channels, total } = await getChannels({
    category: category || undefined,
    query: query || undefined,
    limit: Number.isFinite(limit) ? limit : 120,
    offset: Number.isFinite(offset) ? offset : 0,
  });

  return NextResponse.json({ channels, total }, { headers: { "Cache-Control": "no-store" } });
}
