/**
 * M3U / M3U8 playlist parsing, mirroring the APK's `ParsedPlaylist` and
 * `PlaylistItem` models. The APK parses playlists on device and stores the
 * resulting items; the web port parses them server side so a remote playlist
 * can be imported from a browser without CORS problems.
 */

export interface ParsedPlaylist {
  items: PlaylistEntry[];
}

export interface PlaylistEntry {
  name: string;
  url: string;
  group: string;
  logo?: string;
}

/** Attribute reader for `#EXTINF:-1 tvg-id="x" tvg-logo="y",Channel Name`. */
function readAttributes(line: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /([A-Za-z0-9_-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line)) !== null) {
    attrs[match[1].toLowerCase()] = match[2];
  }
  return attrs;
}

export function parseM3U(content: string): ParsedPlaylist {
  const lines = content.split(/\r?\n/);
  const items: PlaylistEntry[] = [];
  let pendingName = "";
  let pendingGroup = "";
  let pendingLogo: string | undefined;
  let pendingDuration = -1;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) continue;

    if (line.startsWith("#EXTINF:")) {
      const payload = line.slice("#EXTINF:".length);
      const commaIndex = payload.lastIndexOf(",");
      const head = commaIndex >= 0 ? payload.slice(0, commaIndex) : payload;
      pendingName = commaIndex >= 0 ? payload.slice(commaIndex + 1).trim() : "";
      const durationMatch = /^-?\d+(?:\.\d+)?/.exec(head.trim());
      pendingDuration = durationMatch ? Number(durationMatch[0]) : -1;
      const attrs = readAttributes(head);
      pendingGroup = attrs["group-title"] ?? "";
      pendingLogo = attrs["tvg-logo"] || attrs["logo"];
      continue;
    }

    if (line.startsWith("#")) continue;

    items.push({
      name: pendingName || line,
      url: line,
      group: pendingGroup,
      logo: pendingLogo,
    });

    pendingName = "";
    pendingGroup = "";
    pendingLogo = undefined;
    pendingDuration = -1;
  }

  return { items };
}
