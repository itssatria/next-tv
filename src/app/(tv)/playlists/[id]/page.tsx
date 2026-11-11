"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconPlay } from "@/components/Icons";
import { EmptyState } from "@/components/StateBlock";
import { getPlaylists, type StoredPlaylist } from "@/lib/storage";

export default function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [playlist, setPlaylist] = useState<StoredPlaylist | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void params.then(({ id }) => {
      if (cancelled) return;
      const playlistId = Number(id);
      setPlaylist(getPlaylists().find((p) => p.id === playlistId) ?? null);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [params]);

  if (!ready) {
    return <div className="state" role="status" aria-live="polite"><span className="spinner" /></div>;
  }

  if (!playlist) {
    return (
      <EmptyState
        title="Playlist not found"
        body="This playlist is no longer stored on the device. Import it again from the Playlists screen."
      />
    );
  }

  const groups = playlist.items.reduce<Record<string, number>>((acc, item) => {
    const key = item.group || "Ungrouped";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <Link href="/playlists" className="backlink">
        All playlists
      </Link>

      <div className="pagehead">
        <h1 className="pagehead__title">{playlist.title}</h1>
        <p className="pagehead__sub">
          {playlist.channelCount} channels
          {Object.keys(groups).length > 0 ? ` in ${Object.keys(groups).length} groups` : ""}
        </p>
      </div>

      <div className="rows">
        {playlist.items.map((item) => (
          <Link
            key={`${item.id}-${item.url}`}
            href={`/player?url=${encodeURIComponent(item.url)}&name=${encodeURIComponent(item.name)}`}
            className="row"
            data-focusable
            aria-label={`Play ${item.name}`}
          >
            <span className="row__thumb" style={{ display: "grid", placeItems: "center" }}>
              <IconPlay size={18} />
            </span>
            <span>
              <span className="row__title">{item.name}</span>
              <span className="row__meta">
                {item.group ? <span>{item.group}</span> : null}
                <span className="mono">{item.url}</span>
              </span>
            </span>
            <span className="row__right">
              <span className="tile__sub">Play</span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
