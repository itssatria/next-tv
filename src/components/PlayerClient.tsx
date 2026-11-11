"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Dialog } from "./Dialog";
import { IconDownload, IconShare } from "./Icons";
import { Poster } from "./Poster";
import { ErrorState, LoadingState } from "./StateBlock";
import { VideoPlayer, type PlayerTrack } from "./VideoPlayer";
import { getSettings, DEFAULT_SETTINGS, type StoredSettings } from "@/lib/storage";
import type { StreamKind, StreamResolution } from "@/lib/types";

function detectKind(url: string): StreamKind {
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".m3u8") || path.endsWith(".m3u")) return "hls";
  if (path.endsWith(".mpd")) return "dash";
  return "mp4";
}

export function PlayerClient({
  slug,
  directUrl,
  directName,
}: {
  slug: string | null;
  directUrl: string | null;
  directName: string | null;
}) {
  const [resolution, setResolution] = useState<StreamResolution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tracks, setTracks] = useState<PlayerTrack[]>([]);
  const [streamDialogOpen, setStreamDialogOpen] = useState(false);
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const [settings, setSettings] = useState<StoredSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (directUrl) {
      setResolution({
        slug: directUrl,
        title: directName || "Imported stream",
        streams: [{ title: "Source", url: directUrl, kind: detectKind(directUrl) }],
        headers: {},
        drm: "none",
        downloadUrl: directUrl,
        isLive: false,
        related: [],
      });
      setLoading(false);
      return;
    }

    if (!slug) {
      setError("No stream was requested.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/stream/${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      setResolution((await response.json()) as StreamResolution);
    } catch {
      setError("The channel could not be loaded. Check the connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [slug, directUrl, directName]);

  useEffect(() => {
    void load();
  }, [load]);

  const effectiveIndex = settings.forceLowQuality
    ? Math.max(0, (resolution?.streams.length ?? 1) - 1)
    : activeIndex;

  if (loading) return <LoadingState label="Resolving stream" />;

  if (error || !resolution) {
    return (
      <ErrorState
        title="Channel unavailable"
        body={error ?? "This channel could not be resolved."}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <>
      <Link href="/channels" className="backlink">
        Back to channels
      </Link>

      <div className="pagehead">
        <h1 className="pagehead__title">{resolution.title}</h1>
        <p className="pagehead__sub">
          {resolution.isLive ? "On now" : "On demand"}
          {resolution.drm !== "none" ? ` / ${resolution.drm}` : ""}
        </p>
      </div>

      <div className="stage">
        <VideoPlayer
          streams={resolution.streams}
          activeIndex={effectiveIndex}
          onActiveIndexChange={setActiveIndex}
          headers={resolution.headers}
          drm={resolution.drm}
          isLive={resolution.isLive}
          title={resolution.title}
          onSelectTracks={() => setTrackDialogOpen(true)}
          onTracksChange={setTracks}
        />

        <div className="inline" style={{ marginTop: 16 }}>
          {resolution.streams.length > 1 ? (
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => setStreamDialogOpen(true)}
            >
              Choose your preferred stream
            </button>
          ) : null}
          <button type="button" className="btn btn--sm" onClick={() => setOptionsOpen(true)}>
            Advance Options
          </button>
          <a
            className="btn btn--sm"
            href={resolution.streams[effectiveIndex]?.originUrl ?? resolution.downloadUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            <IconDownload size={15} />
            Open source
          </a>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => {
              const url = `${window.location.origin}/player?slug=${encodeURIComponent(resolution.slug)}`;
              if (navigator.share) {
                void navigator.share({ title: resolution.title, url }).catch(() => undefined);
              } else {
                void navigator.clipboard?.writeText(url);
              }
            }}
          >
            <IconShare size={15} />
            Share
          </button>
        </div>
      </div>

      {resolution.related.length > 0 ? (
        <section className="section" style={{ marginTop: 28 }}>
          <div className="section__head">
            <h2 className="section__title">Related</h2>
            <span className="section__meta">{resolution.related.length}</span>
          </div>
          <div className="grid grid--tight">
            {resolution.related.map((item) => (
              <Link
                key={item.slug}
                href={`/player?slug=${encodeURIComponent(item.slug)}`}
                className="tile"
                data-focusable
              >
                <Poster
                  title={item.title}
                  tag={item.category}
                  live={item.isLive}
                  image={item.image || undefined}
                  compact
                />
                <div className="tile__label">{item.title}</div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <Dialog
        open={streamDialogOpen}
        title="Choose your preferred stream"
        onClose={() => setStreamDialogOpen(false)}
      >
        {resolution.streams.map((stream, index) => (
          <button
            key={stream.url}
            type="button"
            className="option"
            aria-selected={index === effectiveIndex}
            onClick={() => {
              setActiveIndex(index);
              setStreamDialogOpen(false);
            }}
          >
            <span className="option__main">
              <span className="option__title">{stream.title}</span>
              <span className="option__sub">
                {stream.kind.toUpperCase()}
                {stream.bitrate ? ` / ${stream.bitrate}` : ""}
              </span>
            </span>
          </button>
        ))}
      </Dialog>

      <Dialog
        open={trackDialogOpen}
        title="Select tracks"
        onClose={() => setTrackDialogOpen(false)}
      >
        {tracks.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            This stream exposes no selectable audio or subtitle tracks.
          </p>
        ) : (
          tracks.map((track) => (
            <div key={`${track.kind}-${track.id}`} className="option" aria-selected={false}>
              <span className="option__main">
                <span className="option__title">{track.label}</span>
                <span className="option__sub">
                  {track.kind === "audio" ? "Audio" : "Subtitle"}
                  {track.language ? ` / ${track.language}` : ""}
                </span>
              </span>
            </div>
          ))
        )}
      </Dialog>

      <Dialog
        open={optionsOpen}
        title="Advance Options"
        onClose={() => setOptionsOpen(false)}
      >
        <div className="stack stack--tight">
          <div>
            <span className="field__label">Referer</span>
            <p className="mono" style={{ margin: "2px 0 0", fontSize: 12, wordBreak: "break-all" }}>
              {resolution.headers.Referer ?? "not set"}
            </p>
          </div>
          <div>
            <span className="field__label">Origin</span>
            <p className="mono" style={{ margin: "2px 0 0", fontSize: 12, wordBreak: "break-all" }}>
              {resolution.headers.Origin ?? "not set"}
            </p>
          </div>
          <div>
            <span className="field__label">User Agent</span>
            <p className="mono" style={{ margin: "2px 0 0", fontSize: 12, wordBreak: "break-all" }}>
              {resolution.headers["User-Agent"] ?? "browser default"}
            </p>
          </div>
          <div>
            <span className="field__label">DRM Type</span>
            <p className="mono" style={{ margin: "2px 0 0", fontSize: 12 }}>
              {resolution.drm}
            </p>
          </div>
          <div>
            <span className="field__label">Network Stream</span>
            <p className="mono" style={{ margin: "2px 0 0", fontSize: 12, wordBreak: "break-all" }}>
              {resolution.streams[effectiveIndex]?.originUrl ?? "not available"}
            </p>
          </div>
        </div>
      </Dialog>
    </>
  );
}
