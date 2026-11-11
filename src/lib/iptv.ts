import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parseM3U } from "./m3u";

/**
 * Live channel directory.
 *
 * The directory itself comes from the public iptv-org index, a community
 * maintained list of publicly reachable live streams. It is fetched once and
 * cached on disk, then served from memory.
 *
 * The previous build of this app hard coded a handful of reference test
 * streams, which meant every channel played the same clip. Pulling the
 * directory instead gives every channel its own real stream.
 */

const DIRECTORY_M3U = "https://iptv-org.github.io/iptv/index.category.m3u";
const STREAMS_JSON = "https://iptv-org.github.io/api/streams.json";
const CACHE_DIR = path.join(process.cwd(), "data", ".cache");
const TTL_MS = 6 * 60 * 60 * 1000;
/** Bump when the parsing changes so an old cache is not reused. */
const CACHE_VERSION = "v2";

export interface DirectoryChannel {
  id: string;
  title: string;
  category: string;
  categorySlug: string;
  url: string;
  logo: string;
  quality: string;
  userAgent?: string;
  referrer?: string;
}

export interface DirectoryCategory {
  title: string;
  slug: string;
  channelCount: number;
}

export interface Directory {
  channels: DirectoryChannel[];
  categories: DirectoryCategory[];
  fetchedAt: number;
  source: string;
}

let cached: Directory | null = null;
let inflight: Promise<Directory | null> | null = null;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function channelId(url: string): string {
  return crypto.createHash("sha1").update(url).digest("base64url").slice(0, 12);
}

async function readCache(file: string): Promise<string | null> {
  try {
    const full = path.join(CACHE_DIR, file);
    const stat = await fs.stat(full);
    if (Date.now() - stat.mtimeMs > TTL_MS) return null;
    return await fs.readFile(full, "utf8");
  } catch {
    return null;
  }
}

async function writeCache(file: string, body: string): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(path.join(CACHE_DIR, file), body, "utf8");
  } catch {
    // A read only checkout still works, the directory is just refetched.
  }
}

interface StreamMeta {
  user_agent?: string | null;
  referrer?: string | null;
  quality?: string | null;
}

async function fetchDirectory(): Promise<{ directory: Directory; m3uBody: string; streamsBody: string }> {
  const [m3uBody, streamsBody] = await Promise.all([
    fetch(DIRECTORY_M3U, { headers: { "User-Agent": "NEXT-TV/1.7" } }).then((r) => {
      if (!r.ok) throw new Error(`directory request failed: ${r.status}`);
      return r.text();
    }),
    fetch(STREAMS_JSON, { headers: { "User-Agent": "NEXT-TV/1.7" } })
      .then((r) => (r.ok ? r.text() : "[]"))
      .catch(() => "[]"),
  ]);

  const metaByUrl = new Map<string, StreamMeta>();
  for (const entry of JSON.parse(streamsBody) as Array<StreamMeta & { url?: string }>) {
    if (entry && typeof entry.url === "string") metaByUrl.set(entry.url, entry);
  }

  const { items } = parseM3U(m3uBody);
  const counts = new Map<string, number>();
  const channels: DirectoryChannel[] = [];

  for (const item of items) {
    if (!item.url || !/^https?:/i.test(item.url)) continue;

    const category = normaliseCategory(item.group);
    const meta = metaByUrl.get(item.url);
    const quality = meta?.quality || qualityFromName(item.name);

    counts.set(category, (counts.get(category) ?? 0) + 1);

    channels.push({
      id: channelId(item.url),
      title: cleanTitle(item.name) || "Untitled channel",
      category,
      categorySlug: slugify(category),
      url: item.url,
      logo: item.logo ?? "",
      quality,
      userAgent: meta?.user_agent || undefined,
      referrer: meta?.referrer || undefined,
    });
  }

  const categories: DirectoryCategory[] = [...counts.entries()]
    .map(([title, channelCount]) => ({ title, slug: slugify(title), channelCount }))
    .sort((a, b) => b.channelCount - a.channelCount);

  return {
    directory: { channels, categories, fetchedAt: Date.now(), source: "iptv-org" },
    m3uBody,
    streamsBody,
  };
}

/** Pull the quality out of a channel title such as "Foo TV (720p)". */
function qualityFromName(name: string): string {
  const match = /\((\d{3,4}p)\)/i.exec(name);
  return match ? match[1].toLowerCase() : "";
}

/**
 * Tidy a directory entry name. The directory appends the quality and, for
 * some channels, a bracketed note. The quality is shown on its own, so the
 * name is left with just the channel.
 */
function cleanTitle(name: string): string {
  return name
    .replace(/\((?:240|360|480|576|720|1080|1440|2160|4320)p\)/gi, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseCategory(group: string | undefined): string {
  const value = (group ?? "").trim();
  if (value.length === 0 || value.toLowerCase() === "undefined") return "General";
  return value;
}

/** Load the directory, using the disk cache when it is still fresh. */
export async function getDirectory(): Promise<Directory | null> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    const cachedBody = await readCache(`index.category.${CACHE_VERSION}.m3u`);
    const cachedStreams = await readCache(`streams.${CACHE_VERSION}.json`);

    if (cachedBody) {
      try {
        const metaByUrl = new Map<string, StreamMeta>();
        if (cachedStreams) {
          for (const entry of JSON.parse(cachedStreams) as Array<StreamMeta & { url?: string }>) {
            if (entry && typeof entry.url === "string") metaByUrl.set(entry.url, entry);
          }
        }

        const { items } = parseM3U(cachedBody);
        const counts = new Map<string, number>();
        const channels: DirectoryChannel[] = [];

        for (const item of items) {
          if (!item.url || !/^https?:/i.test(item.url)) continue;
          const category = normaliseCategory(item.group);
          const meta = metaByUrl.get(item.url);
          counts.set(category, (counts.get(category) ?? 0) + 1);
          channels.push({
            id: channelId(item.url),
            title: cleanTitle(item.name) || "Untitled channel",
            category,
            categorySlug: slugify(category),
            url: item.url,
            logo: item.logo ?? "",
            quality: meta?.quality || qualityFromName(item.name),
            userAgent: meta?.user_agent || undefined,
            referrer: meta?.referrer || undefined,
          });
        }

        const categories: DirectoryCategory[] = [...counts.entries()]
          .map(([title, channelCount]) => ({ title, slug: slugify(title), channelCount }))
          .sort((a, b) => b.channelCount - a.channelCount);

        cached = { channels, categories, fetchedAt: Date.now(), source: "iptv-org (cached)" };
        return cached;
      } catch {
        // Fall through and refetch.
      }
    }

    try {
      const { directory, m3uBody, streamsBody } = await fetchDirectory();
      cached = directory;
      await writeCache(`index.category.${CACHE_VERSION}.m3u`, m3uBody);
      await writeCache(`streams.${CACHE_VERSION}.json`, streamsBody);
      return directory;
    } catch {
      return null;
    }
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function findChannel(directory: Directory, id: string): DirectoryChannel | undefined {
  return directory.channels.find((channel) => channel.id === id);
}

