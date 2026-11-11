"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { IconList, IconTrash } from "@/components/Icons";
import { EmptyState } from "@/components/StateBlock";
import { addPlaylist, getPlaylists, removePlaylist, type StoredPlaylist } from "@/lib/storage";

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<StoredPlaylist[]>([]);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setPlaylists(getPlaylists());
    setLoaded(true);
  }, []);

  const importPlaylist = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const target = url.trim();
      if (!target) return;

      setBusy(true);
      setStatus(null);

      try {
        const response = await fetch(`/api/m3u?url=${encodeURIComponent(target)}`);
        const body = (await response.json()) as {
          title?: string;
          path?: string;
          count?: number;
          items?: Array<{ name: string; url: string; group: string; logo?: string }>;
          error?: string;
        };

        if (!response.ok) {
          setStatus(`Could not import the playlist (${body.error ?? response.status}).`);
          return;
        }

        const items = (body.items ?? []).map((item, index) => ({
          id: index + 1,
          name: item.name,
          url: item.url,
          group: item.group,
          logo: item.logo,
        }));

        if (items.length === 0) {
          setStatus("The playlist loaded but contained no channels.");
          return;
        }

        const stored = addPlaylist({
          id: Date.now(),
          title: body.title ?? new URL(target).hostname,
          path: body.path ?? target,
          channelCount: items.length,
          items,
        });

        setPlaylists(stored);
        setUrl("");
        setStatus(`Imported ${items.length} channels.`);
      } catch {
        setStatus("The playlist could not be reached. Check the address and try again.");
      } finally {
        setBusy(false);
      }
    },
    [url],
  );

  const remove = useCallback((id: number) => {
    setPlaylists(removePlaylist(id));
  }, []);

  return (
    <>
      <div className="pagehead">
        <h1 className="pagehead__title">Playlists</h1>
        <p className="pagehead__sub">Import an M3U feed and keep it on this device</p>
      </div>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Add playlist link</h2>
        </div>

        <form className="stack" onSubmit={importPlaylist}>
          <div className="field">
            <label className="field__label" htmlFor="playlist-url">
              Playlist URL
            </label>
            <input
              id="playlist-url"
              className="field__input"
              type="url"
              value={url}
              placeholder="https://example.com/playlist.m3u"
              onChange={(event) => setUrl(event.target.value)}
              required
            />
            <span className="field__hint">
              The playlist is fetched by the server, so the feed does not need to allow cross
              origin requests.
            </span>
          </div>

          <div className="inline">
            <button type="submit" className="btn btn--accent" disabled={busy}>
              {busy ? "Importing" : "Add Playlist Link"}
            </button>
          </div>

          {status ? (
            <p className={status.startsWith("Imported") ? "notice" : "notice notice--neutral"}>
              {status}
            </p>
          ) : null}
        </form>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Your playlists</h2>
          <span className="section__meta">{playlists.length}</span>
        </div>

        {playlists.length === 0 ? (
          <EmptyState
            title="No playlists found"
            body="Import an M3U address above to build your own channel list on this device."
          />
        ) : (
          <div className="rows">
            {playlists.map((playlist) => (
              <div key={playlist.id} className="row">
                <span className="row__thumb" style={{ display: "grid", placeItems: "center" }}>
                  <IconList size={22} />
                </span>
                <span>
                  <span className="row__title">{playlist.title}</span>
                  <span className="row__meta">
                    <span>{playlist.channelCount} channels</span>
                    <span className="mono">{playlist.path}</span>
                  </span>
                </span>
                <span className="row__right">
                  <Link
                    href={`/playlists/${playlist.id}`}
                    className="btn btn--sm"
                    aria-label={`Open ${playlist.title}`}
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    className="iconbtn"
                    onClick={() => remove(playlist.id)}
                    aria-label={`Remove ${playlist.title}`}
                  >
                    <IconTrash size={18} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
