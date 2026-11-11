import { promises as fs } from "node:fs";
import path from "node:path";
import { getDirectory, slugify, type DirectoryChannel } from "./iptv";
import { buildProxyUrl } from "./proxy";
import type {
  AppConfig,
  Cat,
  Catalog,
  Channel,
  DrmType,
  StreamHeaders,
  StreamResolution,
  StreamUrl,
} from "./types";

/**
 * Server side catalogue.
 *
 * The primary source is the public live channel directory (see lib/iptv.ts).
 * A small bundled seed keeps the app usable when the directory cannot be
 * reached. Every channel resolves to its own real stream, so no two channels
 * play the same content.
 */

const SEED_PATH = path.join(process.cwd(), "data", "seed.json");

interface SeedChannel {
  id: string;
  title: string;
  category: string;
  url: string;
  quality: string;
}

interface SeedFile {
  appVersion: string;
  latestVersion: string;
  updateUrl: string;
  telegramUrl: string;
  licenceUrl: string;
  moreAppsUrl: string;
  forceLowQuality: boolean;
  channels: SeedChannel[];
}

async function loadSeed(): Promise<SeedFile> {
  const raw = await fs.readFile(SEED_PATH, "utf8");
  return JSON.parse(raw) as SeedFile;
}

function toChannel(entry: {
  id: string;
  title: string;
  category: string;
  url: string;
  quality: string;
  image?: string;
}): Channel {
  return {
    id: entry.id,
    title: entry.title,
    image: entry.image ?? "",
    formats: entry.quality,
    category: entry.category,
    slug: entry.id,
    isLive: true,
  };
}

function seedCatalogue(seed: SeedFile): Catalog {
  const channels = seed.channels.map(toChannel);
  const counts = new Map<string, number>();
  for (const channel of channels) {
    counts.set(channel.category, (counts.get(channel.category) ?? 0) + 1);
  }

  const categories: Cat[] = [...counts.entries()]
    .map(([title, channelCount]) => ({ title, slug: slugify(title), channelCount }))
    .sort((a, b) => b.channelCount - a.channelCount);

  return { categories, channels, totalChannels: channels.length, source: "bundled seed" };
}

function directoryCatalogue(directory: {
  channels: DirectoryChannel[];
  categories: Cat[];
  totalChannels: number;
  source: string;
}): Catalog {
  const channels = directory.channels.map((entry) =>
    toChannel({
      id: entry.id,
      title: entry.title,
      category: entry.category,
      url: entry.url,
      quality: entry.quality,
      image: entry.logo,
    }),
  );

  return {
    categories: directory.categories,
    channels,
    totalChannels: directory.totalChannels,
    source: directory.source,
  };
}

interface CatalogueSource {
  channels: Channel[];
  categories: Cat[];
  totalChannels: number;
  source: string;
  /** Stream URL and headers for a channel id, when the source knows them. */
  detail?: (id: string) => { url: string; userAgent?: string; referrer?: string } | undefined;
}

let sourcePromise: Promise<CatalogueSource> | null = null;

async function getSource(): Promise<CatalogueSource> {
  if (sourcePromise) return sourcePromise;

  sourcePromise = (async () => {
    const directory = await getDirectory();

    if (directory && directory.channels.length > 0) {
      const channels = directory.channels.map((entry) =>
        toChannel({
          id: entry.id,
          title: entry.title,
          category: entry.category,
          url: entry.url,
          quality: entry.quality,
          image: entry.logo,
        }),
      );

      return {
        channels,
        categories: directory.categories,
        totalChannels: channels.length,
        source: directory.source,
        detail: (id: string) => {
          const entry = directory.channels.find((channel) => channel.id === id);
          if (!entry) return undefined;
          return { url: entry.url, userAgent: entry.userAgent, referrer: entry.referrer };
        },
      };
    }

    const seed = await loadSeed();
    const catalogue = seedCatalogue(seed);
    return {
      channels: catalogue.channels,
      categories: catalogue.categories,
      totalChannels: catalogue.totalChannels,
      source: catalogue.source,
      detail: (id: string) => {
        const entry = seed.channels.find((channel) => channel.id === id);
        return entry ? { url: entry.url } : undefined;
      },
    };
  })();

  try {
    return await sourcePromise;
  } catch {
    const seed = await loadSeed();
    const catalogue = seedCatalogue(seed);
    return {
      channels: catalogue.channels,
      categories: catalogue.categories,
      totalChannels: catalogue.totalChannels,
      source: catalogue.source,
      detail: (id: string) => {
        const entry = seed.channels.find((channel) => channel.id === id);
        return entry ? { url: entry.url } : undefined;
      },
    };
  }
}

/** How many channels the catalogue endpoint returns up front. */
const PREVIEW_LIMIT = 480;

export async function getCatalog(): Promise<Catalog> {
  const source = await getSource();
  return {
    categories: source.categories,
    channels: source.channels.slice(0, PREVIEW_LIMIT),
    totalChannels: source.totalChannels,
    source: source.source,
  };
}

export async function getChannels(options: {
  category?: string;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<{ channels: Channel[]; total: number }> {
  const source = await getSource();
  const limit = Math.min(Math.max(options.limit ?? 120, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);

  const needle = options.query?.trim().toLowerCase() ?? "";

  let filtered = source.channels;
  if (options.category) {
    filtered = filtered.filter((channel) => slugify(channel.category) === options.category);
  }
  if (needle.length >= 2) {
    filtered = filtered.filter(
      (channel) =>
        channel.title.toLowerCase().includes(needle) ||
        channel.category.toLowerCase().includes(needle),
    );
  }

  return { channels: filtered.slice(offset, offset + limit), total: filtered.length };
}

export async function searchChannels(query: string, limit = 40): Promise<Channel[]> {
  const source = await getSource();
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];

  const matches: Channel[] = [];
  for (const channel of source.channels) {
    if (
      channel.title.toLowerCase().includes(needle) ||
      channel.category.toLowerCase().includes(needle)
    ) {
      matches.push(channel);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}

export async function getAppConfig(): Promise<AppConfig> {
  const seed = await loadSeed();
  return {
    appVersion: seed.appVersion,
    latestVersion: seed.latestVersion,
    updateUrl: seed.updateUrl,
    telegramUrl: seed.telegramUrl,
    licenceUrl: seed.licenceUrl,
    moreAppsUrl: seed.moreAppsUrl,
    forceLowQuality: seed.forceLowQuality,
    sponsor: {
      enabled: true,
      title: "We Need Your Support",
      message:
        "We know ads can be annoying. But without them, we won't have enough funds to keep the app running. Your support means everything to us!",
      url: seed.telegramUrl,
    },
    donate: {
      message: "Help us keep the app running",
      address: "",
      network: "telegram",
    },
  };
}

function detectKind(url: string): StreamUrl["kind"] {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".m3u8") || clean.endsWith(".m3u")) return "hls";
  if (clean.endsWith(".mpd")) return "dash";
  if (clean.endsWith(".webm")) return "mp4";
  return "mp4";
}

function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

export async function resolveStream(id: string): Promise<StreamResolution | null> {
  const source = await getSource();
  const channel = source.channels.find((entry) => entry.id === id);
  if (!channel) return null;

  const detail = source.detail?.(id);
  if (!detail) return null;

  const headers: StreamHeaders = {};
  if (detail.referrer) headers.Referer = detail.referrer;
  if (detail.userAgent) headers["User-Agent"] = detail.userAgent;
  const origin = originOf(detail.url);
  if (origin) headers.Origin = origin;

  const streams: StreamUrl[] = [
    {
      title: channel.formats || "Source",
      // Playback goes through the signed proxy so that streams without CORS
      // headers, and plain HTTP streams, still play in the browser.
      url: buildProxyUrl(detail.url, detail.referrer, detail.userAgent),
      originUrl: detail.url,
      kind: detectKind(detail.url),
    },
  ];

  const related = source.channels
    .filter((entry) => entry.category === channel.category && entry.id !== channel.id)
    .slice(0, 12);

  const drm: DrmType = "none";

  return {
    slug: channel.id,
    title: channel.title,
    streams,
    headers,
    drm,
    downloadUrl: detail.url,
    isLive: true,
    related,
  };
}
