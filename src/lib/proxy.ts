import crypto from "node:crypto";

/**
 * Signed stream proxy.
 *
 * Most public live streams do not send CORS headers, and many of them are
 * plain HTTP, which a browser refuses to load into an HTTPS page as mixed
 * content. A native player does not care about either rule, which is why the
 * original Android app could play them.
 *
 * The web port therefore fetches the stream through this server. Every proxied
 * URL carries a signature over the target and its request headers, so the
 * proxy cannot be pointed at arbitrary hosts by a visitor.
 */

const SECRET =
  process.env.NEXT_TV_PROXY_SECRET ??
  crypto.randomBytes(32).toString("hex");

export interface ProxyPayload {
  /** Target URL. */
  u: string;
  /** Referer the origin expects, if the directory records one. */
  r?: string;
  /** User agent the origin expects, if the directory records one. */
  a?: string;
}

function b64url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function unb64url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url").slice(0, 22);
}

/** Build a signed proxy URL for a target. */
export function buildProxyUrl(target: string, referrer?: string, userAgent?: string): string {
  const payload: ProxyPayload = { u: target };
  if (referrer) payload.r = referrer;
  if (userAgent) payload.a = userAgent;

  const encoded = b64url(JSON.stringify(payload));
  return `/api/proxy?p=${encodeURIComponent(encoded)}&k=${signature(encoded)}`;
}

/** Verify and decode a proxy request. */
export function readProxyRequest(
  payload: string | null,
  key: string | null,
): ProxyPayload | null {
  if (!payload || !key) return null;
  if (signature(payload) !== key) return null;

  try {
    const decoded = JSON.parse(unb64url(payload)) as ProxyPayload;
    if (!decoded || typeof decoded.u !== "string") return null;

    const url = new URL(decoded.u);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    return decoded;
  } catch {
    return null;
  }
}

const PLAYLIST_TYPES = [
  "application/vnd.apple.mpegurl",
  "application/x-mpegurl",
  "audio/mpegurl",
  "audio/x-mpegurl",
  "application/dash+xml",
];

/**
 * Rewrite a playlist so every URI it points at goes through the proxy too.
 * Relative URIs are resolved against the playlist's own address first.
 */
export function rewritePlaylist(text: string, baseUrl: string, referrer?: string, userAgent?: string): string {
  const lines = text.split(/\r?\n/);

  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return line;
      if (trimmed.startsWith("#")) {
        // EXT-X-KEY and EXT-X-MEDIA carry URIs inside the attribute list.
        return line.replace(/URI="([^"]+)"/g, (match, uri: string) => {
          if (/^data:/i.test(uri)) return match;
          return `URI="${buildProxyUrl(resolve(uri, baseUrl), referrer, userAgent)}"`;
        });
      }

      return buildProxyUrl(resolve(trimmed, baseUrl), referrer, userAgent);
    })
    .join("\n");
}

function resolve(uri: string, baseUrl: string): string {
  try {
    return new URL(uri, baseUrl).toString();
  } catch {
    return uri;
  }
}

export function isPlaylist(contentType: string | null, body: string): boolean {
  if (contentType && PLAYLIST_TYPES.some((type) => contentType.includes(type))) return true;
  return body.trimStart().startsWith("#EXTM3U");
}
