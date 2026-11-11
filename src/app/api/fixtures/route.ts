import { NextResponse } from "next/server";
import { getFixtures } from "@/lib/fixtures";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = await getFixtures();
  return NextResponse.json(feed, { headers: { "Cache-Control": "no-store" } });
}
