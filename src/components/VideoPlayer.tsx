"use client";

import Hls from "hls.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/format";
import type { DrmType, StreamHeaders, StreamUrl } from "@/lib/types";
import { IconFullscreen, IconPause, IconPip, IconPlay } from "./Icons";

export interface PlayerTrack {
  id: number;
  label: string;
  language: string;
  kind: "audio" | "subtitle";
}

export function VideoPlayer({
  streams,
  activeIndex,
  onActiveIndexChange,
  headers,
  drm,
  isLive,
  title,
  onSelectTracks,
  onTracksChange,
}: {
  streams: StreamUrl[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  headers: StreamHeaders;
  drm: DrmType;
  isLive: boolean;
  title: string;
  onSelectTracks: () => void;
  onTracksChange: (tracks: PlayerTrack[]) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [tracks, setTracks] = useState<PlayerTrack[]>([]);
  const [showControls, setShowControls] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const stream = streams[activeIndex];

  const teardown = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    setError(null);
    setWaiting(true);
    teardown();

    const isHls = stream.kind === "hls";

    if (isHls && Hls.isSupported()) {
      // Request headers are applied by the server side proxy, which is also
      // what makes streams without CORS headers playable here. The browser
      // refuses to let a page set Referer or User-Agent on a media request.
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: isLive,
        backBufferLength: 60,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        const audioTracks = data.audioTracks ?? [];
        const subtitleTracks = data.subtitleTracks ?? [];
        setTracks([
          ...audioTracks.map((track, index) => ({
            id: index,
            label: track.name || track.lang || `Audio ${index + 1}`,
            language: track.lang ?? "",
            kind: "audio" as const,
          })),
          ...subtitleTracks.map((track, index) => ({
            id: index,
            label: track.name || track.lang || `Subtitle ${index + 1}`,
            language: track.lang ?? "",
            kind: "subtitle" as const,
          })),
        ]);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          setError("The stream could not be reached. Check the connection and try again.");
          teardown();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          setError("This stream is not available right now.");
          teardown();
        }
      });

      hls.loadSource(stream.url);
      hls.attachMedia(video);
    } else {
      video.src = stream.url;
    }

    return teardown;
  }, [stream, headers, isLive, teardown, reloadKey]);

  useEffect(() => {
    onTracksChange(tracks);
  }, [tracks, onTracksChange]);

  /**
   * Autoplay. Browsers block unmuted autoplay unless the page has a recent
   * user gesture, so the first attempt is made with sound and falls back to
   * muted playback when the browser refuses. Every later ready event retries,
   * because the first attempt often lands before any media data exists.
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    let fellBackToMuted = false;

    const attempt = () => {
      void video.play().catch(() => {
        if (fellBackToMuted) return;
        fellBackToMuted = true;
        video.muted = true;
        setMuted(true);
        void video.play().catch(() => undefined);
      });
    };

    const onReady = () => attempt();
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("canplay", onReady);

    return () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("canplay", onReady);
    };
  }, [stream, reloadKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => setCurrent(video.currentTime);
    const onMeta = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setWaiting(false);
    };
    const onPlay = () => {
      setPlaying(true);
      setWaiting(false);
    };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setWaiting(true);
    const onCanPlay = () => setWaiting(false);
    const onError = () => {
      setWaiting(false);
      setError("This stream is not available right now.");
    };
    const onVolume = () => setMuted(video.muted);

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("durationchange", onMeta);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);
    video.addEventListener("volumechange", onVolume);

    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("durationchange", onMeta);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
      video.removeEventListener("volumechange", onVolume);
    };
  }, []);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setError("Playback was blocked by the browser."));
    else video.pause();
  }

  function seekTo(ratio: number) {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = Math.max(0, Math.min(duration, ratio * duration));
  }

  async function toggleFullscreen() {
    const container = videoRef.current?.parentElement;
    if (!container) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await container.requestFullscreen().catch(() => undefined);
  }

  async function togglePictureInPicture() {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      // The browser can refuse picture in picture; the control stays harmless.
    }
  }

  const progress = duration > 0 ? Math.min(1, current / duration) : 0;

  return (
    <div className="player">
      <video
        ref={videoRef}
        className="player__video"
        playsInline
        autoPlay
        muted={muted}
        onDoubleClick={toggleFullscreen}
        onMouseMove={() => setShowControls(true)}
        onMouseLeave={() => playing && setShowControls(false)}
      />

      {isLive ? (
        <span className="player__badge live">
          <span className="live__dot" aria-hidden="true" />
          Live
        </span>
      ) : null}

      {muted && !error ? (
        <button
          type="button"
          className="player__badge player__badge--muted"
          onClick={() => {
            const video = videoRef.current;
            if (video) video.muted = false;
          }}
          aria-label="Turn sound on"
        >
          Muted, press for sound
        </button>
      ) : null}

      {waiting && !error ? (
        <div className="player__overlay">
          <span className="spinner" aria-hidden="true" />
          <span className="muted" style={{ fontSize: 13 }}>
            Buffering
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="player__overlay">
          <div className="player__error">
            <p style={{ margin: "0 0 12px", fontWeight: 600 }}>Stream unavailable</p>
            <p className="muted" style={{ margin: "0 0 14px", fontSize: 13 }}>
              {error}
            </p>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => {
                setError(null);
                setReloadKey((value) => value + 1);
                const video = videoRef.current;
                if (video) {
                  video.load();
                  void video.play().catch(() => undefined);
                }
              }}
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {showControls && !error ? (
        <div className="player__controls">
          <button
            type="button"
            className="player__btn"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <IconPause size={20} /> : <IconPlay size={20} />}
          </button>

          {!isLive ? (
            <>
              <span className="player__time">{formatDuration(current)}</span>
              <div
                className="player__bar"
                role="slider"
                tabIndex={0}
                aria-label="Seek"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(current)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight") seekTo(progress + 0.05);
                  if (event.key === "ArrowLeft") seekTo(progress - 0.05);
                }}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  seekTo((event.clientX - rect.left) / rect.width);
                }}
              >
                <span className="player__progress" style={{ width: `${progress * 100}%` }} />
              </div>
              <span className="player__time">{formatDuration(duration)}</span>
            </>
          ) : (
            <span className="player__time">Live stream</span>
          )}

          <button
            type="button"
            className="player__btn"
            onClick={() => {
              const video = videoRef.current;
              if (video) video.muted = !video.muted;
            }}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>
              {muted ? "MUTE" : "VOL"}
            </span>
          </button>

          {streams.length > 1 ? (
            <button
              type="button"
              className="player__btn"
              onClick={() => onActiveIndexChange((activeIndex + 1) % streams.length)}
              aria-label="Choose stream"
            >
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>
                {stream?.title ?? "AUTO"}
              </span>
            </button>
          ) : null}

          {tracks.length > 0 ? (
            <button
              type="button"
              className="player__btn"
              onClick={onSelectTracks}
              aria-label="Select tracks"
            >
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>
                TRACKS
              </span>
            </button>
          ) : null}

          {typeof document !== "undefined" && document.pictureInPictureEnabled ? (
            <button
              type="button"
              className="player__btn"
              onClick={() => void togglePictureInPicture()}
              aria-label="Picture in picture"
            >
              <IconPip size={18} />
            </button>
          ) : null}

          <button
            type="button"
            className="player__btn"
            onClick={() => void toggleFullscreen()}
            aria-label="Fullscreen"
          >
            <IconFullscreen size={18} />
          </button>
        </div>
      ) : null}

      <span className="sr-only" aria-live="polite">
        {title}
        {drm !== "none" ? `, ${drm} protected` : ""}
      </span>
    </div>
  );
}
