/**
 * Client side persistence. The app keeps three collections (favourites,
 * imported playlists and favourite playlist items) plus a settings store, in
 * localStorage under `nexttv.*` keys.
 */

import type { Favorite, M3UPlaylist, PlaylistItem } from "./types";

const KEYS = {
  favorites: "nexttv.favorites",
  playlists: "nexttv.playlists",
  playlistFav: "nexttv.playlistFav",
  settings: "nexttv.settings",
} as const;

export interface StoredSettings {
  forceLowQuality: boolean;
  /** Sort favourite channels by title rather than insertion order. */
  sortFavourites: boolean;
  theme: "dark" | "light";
}

export const DEFAULT_SETTINGS: StoredSettings = {
  forceLowQuality: false,
  sortFavourites: false,
  theme: "dark",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked. The app keeps working without persistence.
  }
}

/* ---------------------------------------------------------------- favourites */

export function getFavorites(): Favorite[] {
  return read<Favorite[]>(KEYS.favorites, []);
}

export function saveFavorites(items: Favorite[]): void {
  write(KEYS.favorites, items);
}

export function isFavorite(slug: string): boolean {
  return getFavorites().some((f) => f.slug === slug);
}

export function toggleFavorite(channel: Favorite): { favorites: Favorite[]; added: boolean } {
  const favorites = getFavorites();
  const index = favorites.findIndex((f) => f.slug === channel.slug);
  const added = index === -1;
  if (added) favorites.unshift(channel);
  else favorites.splice(index, 1);
  saveFavorites(favorites);
  return { favorites, added };
}

/* ---------------------------------------------------------------- playlists */

/** An imported playlist keeps its parsed items so the screen opens instantly. */
export interface StoredPlaylist extends M3UPlaylist {
  items: PlaylistItem[];
}

export function getPlaylists(): StoredPlaylist[] {
  return read<StoredPlaylist[]>(KEYS.playlists, []);
}

export function savePlaylists(items: StoredPlaylist[]): void {
  write(KEYS.playlists, items);
}

export function addPlaylist(playlist: StoredPlaylist): StoredPlaylist[] {
  const playlists = getPlaylists().filter((p) => p.path !== playlist.path);
  playlists.unshift(playlist);
  savePlaylists(playlists);
  return playlists;
}

export function removePlaylist(id: number): StoredPlaylist[] {
  const playlists = getPlaylists().filter((p) => p.id !== id);
  savePlaylists(playlists);
  return playlists;
}

/** Favourite items inside a playlist, mirroring the `playlistFav` table. */
export function getPlaylistFavorites(): PlaylistItem[] {
  return read<PlaylistItem[]>(KEYS.playlistFav, []);
}

export function savePlaylistFavorites(items: PlaylistItem[]): void {
  write(KEYS.playlistFav, items);
}

export function togglePlaylistFavorite(item: PlaylistItem): PlaylistItem[] {
  const items = getPlaylistFavorites();
  const index = items.findIndex((i) => i.url === item.url);
  if (index >= 0) items.splice(index, 1);
  else items.unshift(item);
  savePlaylistFavorites(items);
  return items;
}

/* ----------------------------------------------------------------- settings */

export function getSettings(): StoredSettings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<StoredSettings>>(KEYS.settings, {}) };
}

export function saveSettings(settings: StoredSettings): void {
  write(KEYS.settings, settings);
}

export function clearAllStorage(): void {
  if (typeof window === "undefined") return;
  for (const key of Object.values(KEYS)) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage failures.
    }
  }
}
