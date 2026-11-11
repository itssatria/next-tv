"use client";

import Link from "next/link";
import type { Channel } from "@/lib/types";
import { FavouriteButton } from "./FavouriteButton";
import { Poster } from "./Poster";

export function ChannelTile({ channel }: { channel: Channel }) {
  return (
    <div className="tile">
      <div style={{ position: "relative" }}>
        <Link
          href={`/player?slug=${encodeURIComponent(channel.slug)}`}
          className="tile"
          data-focusable
          aria-label={`Watch ${channel.title}`}
        >
          <Poster
            title={channel.title}
            tag={channel.category}
            live={channel.isLive}
            image={channel.image || undefined}
          />
          <div className="tile__sub">
            {channel.formats ? `${channel.formats} / ` : ""}
            {channel.isLive ? "Live now" : "On demand"}
          </div>
        </Link>

        <div style={{ position: "absolute", top: 4, left: 4 }}>
          <FavouriteButton
            channel={{
              id: channel.id,
              title: channel.title,
              image: channel.image,
              formats: channel.formats,
              slug: channel.slug,
              category: channel.category,
            }}
            className="iconbtn iconbtn--onposter"
          />
        </div>
      </div>
    </div>
  );
}
