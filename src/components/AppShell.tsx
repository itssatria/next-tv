"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSpatialNavigation } from "@/lib/focus";
import type { Channel } from "@/lib/types";
import { Dialog } from "./Dialog";
import {
  IconCategory,
  IconChevronRight,
  IconFavourite,
  IconHighlight,
  IconList,
  IconLive,
  IconSearch,
  IconSettings,
} from "./Icons";

const NAV = [
  { href: "/events", label: "Live Events", Icon: IconLive },
  { href: "/categories", label: "Categories", Icon: IconCategory },
  { href: "/channels", label: "Channels", Icon: IconHighlight },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

const PAGE_TITLES: Record<string, string> = {
  "/events": "Live Events",
  "/categories": "Categories",
  "/channels": "Channels",
  "/playlists": "Playlists",
  "/favourites": "Favourites",
  "/settings": "Settings",
  "/about": "About",
  "/player": "Player",
};

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Channel[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setSearching(true);

    const timer = window.setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(term)}`, { cache: "no-store" })
        .then((response) => response.json())
        .then((body: { channels?: Channel[] }) => {
          if (!cancelled) setResults(body.channels ?? []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  function openResult(channel: Channel) {
    onClose();
    router.push(`/player?slug=${encodeURIComponent(channel.slug)}`);
  }

  return (
    <Dialog open={open} title="Search" onClose={onClose}>
      <div className="stack">
        <div className="field">
          <label className="field__label" htmlFor="search-input">
            Channel
          </label>
          <input
            id="search-input"
            data-autofocus
            className="field__input"
            type="search"
            value={query}
            placeholder="Type at least two characters"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {searching ? <p className="muted" style={{ fontSize: 14 }}>Searching the directory</p> : null}

        {!searching && query.trim().length >= 2 && results.length === 0 ? (
          <p className="muted" style={{ fontSize: 14 }}>
            Nothing matches "{query.trim()}".
          </p>
        ) : null}

        {results.map((channel) => (
          <button
            key={channel.id}
            type="button"
            className="option"
            onClick={() => openResult(channel)}
          >
            <span className="option__main">
              <span className="option__title">{channel.title}</span>
              <span className="option__sub">
                {channel.category}
                {channel.formats ? ` / ${channel.formats}` : ""}
              </span>
            </span>
            <IconChevronRight size={16} />
          </button>
        ))}
      </div>
    </Dialog>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const navRef = useSpatialNavigation<HTMLDivElement>();

  const title = useMemo(() => {
    if (pathname.startsWith("/categories/")) return "Channels";
    if (pathname.startsWith("/playlists/")) return "Playlist";    return PAGE_TITLES[pathname] ?? "NEXT TV";
  }, [pathname]);

  return (
    <div className="shell" ref={navRef}>
      <header className="topbar">
        <Link href="/events" className="topbar__brand" aria-label="NEXT TV home">
          NEXT<span>TV</span>
        </Link>
        <span className="topbar__title">{title}</span>
        <span className="topbar__spacer" />

        <div className="topbar__actions">
          <button
            type="button"
            className="iconbtn"
            onClick={() => setSearchOpen(true)}
            aria-label="Search channels"
          >
            <IconSearch size={19} />
          </button>
          <Link href="/playlists" className="iconbtn" aria-label="Playlists">
            <IconList size={19} />
          </Link>
          <Link href="/favourites" className="iconbtn" aria-label="Favourites">
            <IconFavourite size={19} />
          </Link>
        </div>
      </header>

      <div className="shell__body">
        <main className="shell__content">{children}</main>
      </div>

      <nav className="bottomnav" aria-label="Primary">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className="bottomnav__item"
              aria-current={active ? "page" : undefined}
            >
              <Icon size={20} className="bottomnav__icon" />
              <span className="bottomnav__label">{label}</span>
            </Link>
          );
        })}
      </nav>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
