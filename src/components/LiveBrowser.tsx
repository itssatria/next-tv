"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Cat, Channel } from "@/lib/types";
import { ChannelTile } from "./ChannelTile";
import { EmptyState, ErrorState, LoadingState } from "./StateBlock";

const PAGE_SIZE = 120;

/**
 * Channel browser.
 *
 * A horizontal category strip filters the grid, and the grid pages in as the
 * viewer scrolls through a directory of thousands of channels. When a search
 * term is supplied the strip steps aside and the grid becomes the results.
 */
export function LiveBrowser({
  categories,
  initialChannels,
  initialTotal,
  initialCategory,
  initialQuery,
}: {
  categories: Cat[];
  initialChannels: Channel[];
  initialTotal: number;
  initialCategory?: string;
  initialQuery?: string;
}) {
  const [category, setCategory] = useState<string | undefined>(initialCategory);
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = initialQuery?.trim() ?? "";

  const load = useCallback(
    async (
      nextCategory: string | undefined,
      nextQuery: string,
      offset: number,
      append: boolean,
    ) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (nextCategory) params.set("category", nextCategory);
      if (nextQuery.length >= 2) params.set("q", nextQuery);

      try {
        const response = await fetch(`/api/channels?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { channels: Channel[]; total: number };
        setChannels((current) => (append ? [...current, ...body.channels] : body.channels));
        setTotal(body.total);
      } catch {
        setError("The channel list could not be loaded. Check the connection and try again.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (category === initialCategory) return;
    void load(category, query, 0, false);
  }, [category, initialCategory, load, query]);

  function selectCategory(slug: string | undefined) {
    setCategory(slug);
  }

  const hasMore = channels.length < total;
  const searching = query.length >= 2;

  return (
    <>
      {searching ? (
        <div className="inline" style={{ marginBottom: 18 }}>
          <span className="chip" aria-current="true">
            Searching for {query}
          </span>
          <Link href="/channels" className="chip">
            Clear
          </Link>
        </div>
      ) : (
        <div className="chips" style={{ marginBottom: 18 }}>
          <button
            type="button"
            className="chip"
            aria-pressed={category === undefined}
            onClick={() => selectCategory(undefined)}
          >
            All
          </button>
          {categories.map((entry) => (
            <button
              key={entry.slug}
              type="button"
              className="chip"
              aria-pressed={category === entry.slug}
              onClick={() => selectCategory(entry.slug)}
            >
              {entry.title}
              <span className="muted mono" style={{ fontSize: 11 }}>
                {entry.channelCount}
              </span>
            </button>
          ))}
        </div>
      )}

      {error ? (
        <ErrorState body={error} onRetry={() => void load(category, query, 0, false)} />
      ) : null}

      {!error && channels.length === 0 && !loading ? (
        <EmptyState
          title={searching ? "No channels found" : "No channels found"}
          body={
            searching
              ? `Nothing in the directory matches "${query}".`
              : "This category has no entries in the directory right now."
          }
        />
      ) : null}

      {channels.length > 0 ? (
        <div className="grid">
          {channels.map((channel) => (
            <ChannelTile key={channel.id} channel={channel} />
          ))}
        </div>
      ) : null}

      {loading ? <LoadingState label="Loading channels" /> : null}

      {!loading && !error && hasMore ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
          <button
            type="button"
            className="btn"
            onClick={() => void load(category, query, channels.length, true)}
          >
            Load more
          </button>
        </div>
      ) : null}

      {!loading && !error && channels.length > 0 ? (
        <p className="muted" style={{ marginTop: 16, fontSize: 12 }}>
          Showing {channels.length} of {total} channels
        </p>
      ) : null}
    </>
  );
}
