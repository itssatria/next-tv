import { NextResponse } from "next/server";
import { isPlaylist, readProxyRequest, rewritePlaylist } from "@/lib/proxy";

export const dynamic = "force-dynamic";

/**
 * Stream proxy.
 *
 * Fetches a live stream on behalf of the player and, for playlists, rewrites
 * every segment URL to point back here so the whole chain stays reachable
 * from the browser. The request must carry a valid signature, otherwise it is
 * refused: this endpoint is not an open proxy.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const payload = readProxyRequest(searchParams.get("p"), searchParams.get("k"));

  if (!payload) {
    return new NextResponse("Bad or missing proxy signature", { status: 403 });
  }

  const headers: Record<string, string> = {
    "User-Agent":
      payload.a ?? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    Accept: "*/*",
  };
  if (payload.r) headers.Referer = payload.r;

  const range = request.headers.get("range");
  if (range) headers.Range = range;

  let upstream: Response;
  try {
    upstream = await fetch(payload.u, {
      headers,
      redirect: "follow",
      cache: "no-store",
    });
  } catch {
    return new NextResponse("The stream could not be reached", { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new NextResponse(`Upstream responded ${upstream.status}`, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type");

  if (isPlaylist(contentType, "")) {
    const body = await upstream.text();
    const rewritten = rewritePlaylist(body, payload.u, payload.r, payload.a);

    return new NextResponse(rewritten, {
      status: 200,
      headers: {
        "Content-Type": contentType ?? "application/vnd.apple.mpegurl",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // A body is only inspected for the playlist marker when the type is unknown.
  if (!contentType) {
    const body = await upstream.text();
    if (isPlaylist(null, body)) {
      const rewritten = rewritePlaylist(body, payload.u, payload.r, payload.a);
      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new NextResponse(body, {
      status: 200,
      headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
    });
  }

  const buffer = await upstream.arrayBuffer();
  const responseHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  };

  const length = upstream.headers.get("content-length");
  if (length) responseHeaders["Content-Length"] = length;
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) responseHeaders["Content-Range"] = contentRange;
  const acceptRanges = upstream.headers.get("accept-ranges");
  if (acceptRanges) responseHeaders["Accept-Ranges"] = acceptRanges;

  return new NextResponse(buffer, {
    status: upstream.status === 206 ? 206 : 200,
    headers: responseHeaders,
  });
}
