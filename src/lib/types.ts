/**
 * Domain types for NEXT TV.
 *
 * The shapes follow the model names recovered from the source Android TV
 * application (Cat, Channel, StreamUrl, M3UPlaylist, PlaylistItem, Sponsor,
 * Donate, AppData), so the browser app and the original describe the same
 * entities.
 */

export type StreamKind = "hls" | "dash" | "mp4" | "webrtc";

/** One playable rendition of a channel. */
export interface StreamUrl {
  title: string;
  /** Playback URL. Usually a signed proxy URL, see lib/proxy.ts. */
  url: string;
  /** The upstream URL, shown in the stream details. */
  originUrl?: string;
  kind: StreamKind;
  bitrate?: string;
}

/** Request headers a stream needs, matching the original app's model. */
export interface StreamHeaders {
  Referer?: string;
  "User-Agent"?: string;
  Origin?: string;
}

/** DRM scheme. Browser playback is clear, so this is normally "none". */
export type DrmType = "none" | "widevine" | "playready" | "clearkey";

export interface Channel {
  id: string;
  title: string;
  /** Channel logo, when the directory provides one. */
  image: string;
  /** Quality label, e.g. "1080p". */
  formats: string;
  category: string;
  slug: string;
  isLive: boolean;
}

export interface Cat {
  slug: string;
  title: string;
  channelCount: number;
}

export interface M3UPlaylist {
  id: number;
  title: string;
  path: string;
  channelCount: number;
}

export interface PlaylistItem {
  id: number;
  name: string;
  url: string;
  group: string;
  logo?: string;
}

/** A favourite channel. */
export interface Favorite {
  id: string;
  title: string;
  image: string;
  formats: string;
  slug: string;
  category: string;
}

export interface Sponsor {
  enabled: boolean;
  title: string;
  message: string;
  url: string;
}

export interface Donate {
  message: string;
  address: string;
  network: string;
}

export interface AppConfig {
  appVersion: string;
  latestVersion: string;
  updateUrl: string;
  telegramUrl: string;
  licenceUrl: string;
  moreAppsUrl: string;
  forceLowQuality: boolean;
  sponsor: Sponsor;
  donate: Donate;
}

/** Resolved playback descriptor for a channel. */
export interface StreamResolution {
  slug: string;
  title: string;
  streams: StreamUrl[];
  headers: StreamHeaders;
  drm: DrmType;
  /** Download destination, the original app's `dl` navigation argument. */
  downloadUrl: string;
  isLive: boolean;
  related: Channel[];
}

export interface Catalog {
  categories: Cat[];
  channels: Channel[];
  totalChannels: number;
  source: string;
}
