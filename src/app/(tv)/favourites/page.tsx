"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconPlay, IconTrash } from "@/components/Icons";
import { EmptyState } from "@/components/StateBlock";
import { getFavorites, getPlaylistFavorites, saveFavorites } from "@/lib/storage";
import type { Favorite, PlaylistItem } from "@/lib/types";

export default function FavouritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [playlistFavorites, setPlaylistFavorites] = useState<PlaylistItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setFavorites(getFavorites());
    setPlaylistFavorites(getPlaylistFavorites());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="state" role="status" aria-live="polite">
        <span className="spinner" />
      </div>
    );
  }

  function removeFavorite(slug: string) {
    const next = getFavorites().filter((f) => f.slug !== slug);
    saveFavorites(next);
    setFavorites(next);
  }

  return (
    <>
      <div className="pagehead">
        <h1 className="pagehead__title">Favourites</h1>
        <p className="pagehead__sub">Kept on this device, the way the app stores them</p>
      </div>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Channels</h2>
          <span className="section__meta">{favorites.length}</span>
        </div>

        {favorites.length === 0 ? (
          <EmptyState
            title="No favourites yet"
            body="Open a channel and press the star to keep it here for quick access."
            action={
              <Link href="/categories" className="btn btn--sm">
                Browse categories
              </Link>
            }
          />
        ) : (
          <div className="rows">
            {favorites.map((favorite) => (
              <div key={favorite.slug} className="row">
                <span className="row__thumb" style={{ display: "grid", placeItems: "center" }}>
                  <IconPlay size={18} />
                </span>
                <span>
                  <Link
                    href={`/player?slug=${encodeURIComponent(favorite.slug)}`}
                    className="row__title"
                    data-focusable
                  >
                    {favorite.title}
                  </Link>
                  <span className="row__meta">
                    <span>{favorite.category}</span>
                    <span>{favorite.formats.split("|").join(" / ")}</span>
                  </span>
                </span>
                <span className="row__right">
                  <button
                    type="button"
                    className="iconbtn"
                    onClick={() => removeFavorite(favorite.slug)}
                    aria-label={`Remove ${favorite.title} from favourites`}
                  >
                    <IconTrash size={18} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {playlistFavorites.length > 0 ? (
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">Playlist favourites</h2>
            <span className="section__meta">{playlistFavorites.length}</span>
          </div>
          <div className="rows">
            {playlistFavorites.map((item) => (
              <Link
                key={item.url}
                href={`/player?url=${encodeURIComponent(item.url)}&name=${encodeURIComponent(item.name)}`}
                className="row"
                data-focusable
              >
                <span className="row__thumb" style={{ display: "grid", placeItems: "center" }}>
                  <IconPlay size={18} />
                </span>
                <span>
                  <span className="row__title">{item.name}</span>
                  <span className="row__meta">
                    {item.group ? <span>{item.group}</span> : null}
                  </span>
                </span>
                <span className="row__right" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
