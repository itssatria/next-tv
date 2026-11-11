# NEXT TV

A browser player for live television, built for the big screen. Next.js 15, React 19,
TypeScript and hls.js.

The app browses a public directory of live channels, plays them with HLS in the browser,
and lets you import your own M3U playlists so the guide reflects the channels you
actually watch.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

The channel directory is fetched on the first request and cached on disk for six hours,
so the first start takes a couple of seconds and later starts are instant.

---

## Where the channels come from

The guide is built from the public [iptv-org](https://github.com/iptv-org/iptv) index,
a community maintained list of publicly reachable live streams. At the time of writing
it carries around 12,000 channels across 30 categories: News, Sports, Movies, Music,
Kids, Documentary, Education, Regional and more.

Every channel carries its own logo, its quality, and the `Referer` and `User-Agent` the
origin expects. Individual streams are third party and some are geo restricted or go
offline without notice, so a channel can fail to open. The player says so and offers a
retry rather than pretending to play.

Your own channels are added on the **Playlists** screen by importing an M3U address.
Imported playlists stay in the browser and are never sent anywhere.

### Why the server proxies the stream

Most public live streams do not send CORS headers, and many of them are plain HTTP,
which a browser refuses to load into an HTTPS page as mixed content. A native player
does not care about either rule.

So the app fetches the stream through its own server. Every proxied URL carries a
signature over the target and its request headers, so the endpoint cannot be pointed
at arbitrary hosts by a visitor: an unsigned request is refused with `403`. Playlists
are rewritten as they pass through, so every segment, variant and key URI is proxied
too.

---

## Screens

| Route         | Screen                                                            |
| ------------- | ----------------------------------------------------------------- |
| `/`           | Splash, hands over to `/events` after about a second               |
| `/events`     | Live Events: what is on now, what is coming up, what finished      |
| `/categories` | The 30 categories, each opening its own channel list              |
| `/channels`   | Every live channel, with a category strip, search and paging       |
| `/playlists`  | Import and open M3U playlists                                     |
| `/favourites` | Channels you starred, stored on the device                        |
| `/settings`   | Streaming options, notifications, directory info, data             |
| `/player`     | The player                                                        |
| `/about`      | What the app does, the content notice and the licences            |

The interface is built for a television: a dense guide grid, a floating bottom
navigation bar, and arrow keys that move a focus ring between tiles using the element
geometry rather than the document order.

---

## Live Events

The first screen is a fixture list, the way the original application opened on its live
events screen. It shows three sections: **On now**, **Upcoming** and **Finished**.

The fixtures come from ESPN's public scoreboard API, which returns real fixtures with
real kick off times and a live or finished status, so the titles on screen are genuine
rather than invented. Roughly 150 fixtures are listed across a seven day horizon,
drawn from the leagues whose schedule the API serves day by day.

A fixture row links into the channel guide filtered by the team names, which is where a
viewer looks for a dedicated channel. If the guide has nothing matching, the full list
is shown instead.

---

## The player

- HLS through `hls.js`, with native HLS as a fallback
- Play, pause, mute, seek, fullscreen and picture in picture
- Audio and subtitle track selection when the stream exposes them
- "Advance Options" shows the request headers and the real upstream URL for a stream
- Autoplay falls back to muted playback when the browser refuses, with a clear prompt to
  turn the sound back on

There is no ad break in front of the stream.

---

## Configuration

| Variable                  | Purpose                                                    |
| ------------------------- | ---------------------------------------------------------- |
| `NEXT_TV_PROXY_SECRET`    | Signing secret for the stream proxy. Random per process if unset. |
| `NEXT_TV_TELEGRAM_URL`    | Community link shown in Settings. Hidden when unset.        |
| `NEXT_TV_MORE_APPS_URL`   | Secondary link shown in Settings. Hidden when unset.        |
| `NEXT_TV_UPDATE_URL`      | Where "Update Now" points. Hidden when unset.               |

---

## Verification

`tools/verify.mjs` drives headless Chrome over the DevTools protocol (no browser
automation dependency, it uses Node's built-in `WebSocket`) and walks the app the way a
person would.

```bash
npm run build
npm start -- -p 3100
node tools/verify.mjs http://localhost:3100 verify-output
```

It checks the splash hand over, the live guide, the category strip, arrow key focus
movement, search results, the sponsor panel releasing the player, real video actually
playing, the options dialog, Escape to close, the categories screens, favourite toggling,
playlist import, the settings switches, clear data confirmation, the About page, and
horizontal overflow at 1600px and 390px wide. Screenshots and a JSON report are written
to the output directory.

---

## Layout

```
src/
  app/
    page.tsx                 splash
    (tv)/                    routes wrapped in the app shell
      events/ channels/ categories/ playlists/ favourites/ settings/ about/ player/
    api/
      catalog/ channels/ search/ fixtures/ stream/[slug]/ proxy/ m3u/ config/ update/
  components/
    AppShell.tsx             top bar, bottom nav, search dialog
    LiveBrowser.tsx          category strip, channel grid, paging
    FixtureRow.tsx           a fixture in the live events list
    VideoPlayer.tsx          hls.js player with custom controls
    Poster.tsx               logo tile with a generated fallback slate
    ...
  lib/
    iptv.ts                  directory fetch, parse and disk cache
    fixtures.ts              fixture feed from the public scoreboard API
    catalog.ts               catalogue, search and stream resolution
    proxy.ts                 signed proxy URLs and playlist rewriting
    m3u.ts                   playlist parser
    storage.ts               favourites, playlists, settings
    focus.ts                 spatial (D-pad) keyboard navigation
```

---

## Content

NEXT TV does not host any channels. Every stream link comes from a third party website
that publishes it freely on the internet. This project only provides a way to reach
them, and all content remains the copyright of its owner.
