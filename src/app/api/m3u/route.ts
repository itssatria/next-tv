import { NextResponse } from "next/server";
import { parseM3U } from "@/lib/m3u";

export const dynamic = "force-dynamic";

/**
 * Import a remote M3U playlist.
 *
 * The APK parses playlists on device. The browser port fetches them server
 * side so a remote playlist can be imported without the browser's CORS rules
 * blocking the request.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");

  if (!target) {
    return NextResponse.json({ error: "missing_url" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(target);
  } catch {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return NextResponse.json({ error: "unsupported_protocol" }, { status: 400 });
  }

  try {
    const response = await fetch(parsedUrl.toString(), {
      headers: { "User-Agent": "NEXT-TV-Web/1.7" },
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "upstream_error", status: response.status },
        { status: 502 },
      );
    }

    const body = await response.text();
    const playlist = parseM3U(body);

    return NextResponse.json(
      {
        title: parsedUrl.hostname,
        path: parsedUrl.toString(),
        count: playlist.items.length,
        items: playlist.items,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
