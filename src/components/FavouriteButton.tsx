"use client";

import { useCallback, useEffect, useState } from "react";
import { getFavorites, toggleFavorite } from "@/lib/storage";
import type { Favorite } from "@/lib/types";
import { IconFavourite } from "./Icons";

/** Favourite state for a channel, persisted the way the APK persists its `favorites` table. */
export function useFavourite(channel: Favorite) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(getFavorites().some((f) => f.slug === channel.slug));
  }, [channel.slug]);

  const toggle = useCallback(() => {
    const { added } = toggleFavorite(channel);
    setSaved(added);
  }, [channel]);

  return { saved, toggle };
}

export function FavouriteButton({
  channel,
  className = "iconbtn",
}: {
  channel: Favorite;
  className?: string;
}) {
  const { saved, toggle } = useFavourite(channel);

  return (
    <button
      type="button"
      className={className}
      data-focusable
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${channel.title} from favourites` : `Add ${channel.title} to favourites`}
    >
      <IconFavourite size={18} filled={saved} />
    </button>
  );
}
