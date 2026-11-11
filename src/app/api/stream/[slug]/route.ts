import { NextResponse } from "next/server";
import { resolveStream } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const resolution = await resolveStream(decodeURIComponent(slug));

  if (!resolution) {
    return NextResponse.json({ error: "unknown_slug", slug }, { status: 404 });
  }

  return NextResponse.json(resolution, { headers: { "Cache-Control": "no-store" } });
}
