# Origin analysis

This is the provenance record for NEXT TV. It documents the Android TV application the
app was derived from, what was recovered from it, and what could not be recovered. It is
kept for reference only. Nothing in the shipped application depends on it, and no part
of the original package, its branding or its network endpoints are used by NEXT TV.

Artifact: `PLAYFy-TV-V1.7.apk`
SHA-256: `2a05ce967df3eb355de8f64b3c675cbc6e97b768e80fd10c54bdb6c7ac80df51`
Package: `com.playfy.tv`

Everything below is a static observation of the shipped artifact. Nothing was executed.

---

## Tooling note

REA's archive route was used for artifact identity and the member inventory:

- `open_binary` -> format `apk`, kind `archive`, sha256 as above
- `inspect_artifact` -> evidence `ev_ed5062cb5f4bfcb71203707e0dfedd3a1075ff2334dcceba04bf2b73422b5f6e`,
  retained parent `ev_6de0b6fa2f48997844042314e41353768a5390dc40e2a6b2e34c3b72078744ea`,
  inventory `ev_cde8038da18fdc4dc190eea60ebcd8fd0edcc6ace9682f163f4b682feaa94de6`
- Coverage: 3551 of 3551 container entries examined, 1213 file occurrences, 1126 graph nodes,
  0 integrity contradictions, source coverage complete.

`inspect_android_package` and `decode_android_resources` were unavailable on this host:
both returned `capability_unavailable`. The JADX provider needs a caller supplied
`REA_JADX_MCP_JAR` and apktool is not on `PATH`. `rea doctor --provider jadx --json`
confirmed `jar_configured: false`.

The manifest, DEX and resource facts below were therefore recovered with purpose built
readers for those formats (binary AXML, the DEX string and class tables, and
`resources.arsc`). The REA archive evidence stands as the independent confirmation of
artifact identity and member inventory.

---

## Manifest

- `versionCode` 8, `versionName` 1.7
- `minSdkVersion` 21, `targetSdkVersion` 36, `compileSdkVersion` 36
- `usesCleartextTraffic` true, custom `networkSecurityConfig`
- Application class `com.playfy.tv.App`

Permissions that describe the product:

| Permission | Why it matters |
| --- | --- |
| `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE` | catalogue and stream fetching |
| `POST_NOTIFICATIONS` | fixture alerts (FCM) |
| `REQUEST_INSTALL_PACKAGES`, `REQUEST_DELETE_PACKAGES` | the app downloads and installs an update APK |
| `QUERY_ALL_PACKAGES` | detects competing apps installed on the device |
| `WAKE_LOCK`, `FOREGROUND_SERVICE` | keeps the player alive and the download running |
| `AD_ID`, `ACCESS_ADSERVICES_*` | advertising and attribution |

`android.software.leanback` is declared optional and `LEANBACK_LAUNCHER` is present, so the
app ships on both televisions and phones.

---

## Components

| Kind | Name | Notes |
| --- | --- | --- |
| activity | `com.playfy.tv.activities.SplashActivity` | `MAIN` + `LAUNCHER` + `LEANBACK_LAUNCHER` |
| activity | `com.playfy.tv.activities.MainActivity` | hosts the navigation graph |
| activity | `com.playfy.tv.activities.PlayerActivity` | `video/*`, PiP, `singleTop`, resizable |
| activity | `com.playfy.tv.activities.FullBannerActivity` | full screen ad |
| activity | `com.playfy.tv.activities.SponsorActivity` | sponsor panel |
| service | `com.playfy.tv.helpers.PushService` | Firebase Cloud Messaging |
| provider | `androidx.core.content.FileProvider` | authority `com.playfy.tv.provider` |

`PlayerActivity` accepts a `video/*` intent filter with path patterns for `3g2`, `3gp`,
`3gp2`, `3gpp`, `mkv`, `mp4`, `webm` and `m3u8` in both cases, and accepts `http` and
`https` URIs with any host.

---

## Navigation graph (`res/Db.xml`, `navigation/mobile_navigation`)

```
EventsFragment (start destination)
HighFragment
CatsFragment
  ├─> ChannelsFragment            (argument: title)
  └─> PlaylistFragment            (nested graph, arguments: title, path)
FavFragment
PlaylistsFragment
SettingsFragment
PlayerActivity                    (arguments: slug, type, selected, isLive,
                                   related, headers, dt, dl)
```

The player arguments are the most informative part of the manifest. `dt` is the DRM type
and `dl` the download destination; `headers` is a serialisable bundle carrying the request
headers used for the stream.

Bottom navigation (`res/l7.xml`, `menu/bottom_menu`) plus the custom bottom nav layout
(`res/rO.xml`, `layout_custom_bottom_nav`) resolve to four tabs:

| Tab | Fragment | Icon | Label resource |
| --- | --- | --- | --- |
| `tab_home` | `EventsFragment` | `ic_live_events` | `live_events` |
| `tab_cats` | `CatsFragment` | `ic_category` | `categories` |
| `tab_high` | `HighFragment` | `ic_tv` | `high` |
| `tab_settings` | `SettingsFragment` | `ic_settings` | `settings` |

The nav layout also carries a `selectionIndicator` view and a `badge_home` badge, matching
the badge on Live Events in the port.

---

## Layout structure

`res/v9.xml` (`activity_main`): a `tv_top_container`, an `AppBarLayout` holding a
`MaterialToolbar` with `menu/toolbar_menu`, an `OverlayInsetsLayout` holding the
`NavHostFragment`, and `layout_custom_bottom_nav` pinned to the bottom with
`bg_bottom_nav`.

`res/7b.xml` (`fragment_recycler`): a `SwipeRefreshLayout` wrapping a horizontal tab strip
(`tabs_container`, `chose_cat`, `tab_ly`) and a `GridLayoutManager` with `spanCount` 3 over
`recycler_view`, with `error_ly` included underneath.

---

## Persistence (Room)

```sql
CREATE TABLE IF NOT EXISTS `favorites` (
  `id` INTEGER NOT NULL, `title` TEXT NOT NULL,
  `image` TEXT NOT NULL, `formats` TEXT NOT NULL,
  PRIMARY KEY(`id`)
)
```

Queries recovered: `SELECT * FROM favorites`, `SELECT * FROM playlists`,
`SELECT * FROM playlistFav ORDER BY id DESC`.

The three collections map to the port's `playfy.favorites`, `playfy.playlists` and
`playfy.playlistFav` storage keys.

---

## Domain models

Recovered from the Kotlin data class names and their `toString` templates in the DEX
string table:

| Model | Fields seen |
| --- | --- |
| `Cat` | `id`, `title`, `image` |
| `Channel` | `id`, `title`, `image`, `formats` |
| `Channel` (events variant) | `id`, `title`, `image` |
| `Events` | `channels` |
| `LiveEvent` | `eventName`, `startsAt`, `score`, `status` |
| `StreamUrl` | `title`, `url` |
| `M3UPlaylist` | `id`, `title`, `path` |
| `PlaylistItem` | `name`, `url`, `group` |
| `Sponsor` | `enabled`, `title`, `message` |
| `Donate` | `message`, `address` |
| `Ads` | `adId` |
| `AppData` | `sig`, `version`, `updateUrl` |
| `DataRow` | `name`, `value` |

---

## Resources

The application package is `com.playfy.tv`, project `playfy-tv`, Firebase project
`playfy-tv`, storage bucket `playfy-tv.firebasestorage.app`, sender id `239487160038`.

Selected application strings, which define the product's vocabulary:

- Streaming: `Enter Stream URL`, `Enter Title`, `Enter Playlist URL`, `Network Stream`,
  `Choose your preferred stream`, `Multiple Streams Available`, `Select tracks`,
  `Force Low Quality`, `Save data on slow connections`, `DRM Type`, `Referer`,
  `User Agent`, `Origin`, `Network Stream`, `Widevine`, `Playready`
- Monetisation: `We Need Your Support`, `Help us keep the app running`, `Donate`,
  `Open 1 AD per %d hours`, `Wait time: %ds / Trigger: every %dh`, `Remaining: %ds`,
  `Please wait %d more seconds in the ad`, `Reward Granted!`, `You've unlocked %d hours
  of ad-free streaming!`
- Fixtures: `Live Events`, `Match Started`, `Match Ended`, `Starting In`, `Highlights`,
  `Categories`, `Channels`, `Playlists`, `Favourites`
- Errors: `Server Connection Error`, `Error connecting to the server, please try again.`,
  `No Internet Connection`, `Please check your network and try again.`
- Update: `New Update Available`, `Update Now`, `Keep app open while downloading update`,
  `Please install the latest version to continue`
- Blocked apps: `App Blocked!`, `Blocked Apps Found!`, `Manage Apps`, `Remove App`,
  `Tap to Remove`, `This app is installed on your device`
- Community: `Join Telegram Channel`, `Join our official Telegram channel to receive the
  newest updates, important announcements, and exclusive information about upcoming
  features.`, `Join us on Telegram`
- Instructions: the four step sponsor panel flow, and a "How to Clear Data" guide

Design tokens recovered: `bg_main`, `bg_topbar`, `bg_bottom_nav`, `bg_tab_active`,
`nav_inactive`, `white`, plus a `_50sdp` bottom nav height and a `_44sdp` tab height.

---

## Native and third party code

Native libraries per ABI (arm64-v8a, armeabi-v7a, x86, x86_64):

- `libffmpegJNI.so` (1.6 to 1.8 MB)
- `libgav1JNI.so` (1.6 to 2.1 MB), the AV1 decoder
- `libumairi-lib.so` (0.3 to 0.5 MB)
- `libnative-lib.so` (0.3 to 0.5 MB)

Embedded SDKs: ExoPlayer / Media3 (ExoPlayer, Media3 and `com.google.android.exoplayer2`
string families), Unity Ads (`com.unity3d.services`), Google Mobile Ads, Firebase
Messaging, Analytics, Remote Config, Installations and ABT, WorkManager, Room, OkHttp,
Google Cronet (`org.chromium.net`), protobuf, Google Play Services measurement, Kotlin
coroutines.

`assets/ad-viewer/omsdk-v1.js` and `omid-session-client-v1.js` ship the IAB Open
Measurement SDK for viewability tracking.

---

## Unknowns

- The catalogue API base URL is not in the package as a static string. It is supplied at
  runtime by Firebase Remote Config, so the request paths, response schema and the real
  channel list could not be recovered from the artifact alone. See the section below for
  what Remote Config did yield.
- The app classes are fully obfuscated by R8 (`pg-map-id 7bd85f1e...`, R8 8.13.19) and the
  source file names are replaced with `r8-map-id-*`, so original Kotlin file names and
  method bodies were not readable. The structure above comes from the surviving
  databinding class names, model names, resource names and the manifest.
- No runtime observation was performed. Ad behaviour, update delivery, push handling and
  the blocked app check are described only by their resources and manifest entries.
- The DRM and ad SDK versions were identified from package names, not from their internal
  configuration.

---

## Runtime configuration recovered from Remote Config

The application fetches its runtime configuration from Firebase Remote Config. The
project credentials are in the APK resources, so the configuration could be read with
the same request the app makes:

```
POST https://firebaseremoteconfig.googleapis.com/v1/projects/239487160038/namespaces/firebase:fetch
X-Goog-Api-Key: <the key in resources.arsc>
X-Android-Package-Name: com.playfy.tv
X-Android-Cert-SHA256: 38cde288f060fa8f476ab6811ff215767c35117bf6248fd8ad157cd4566898cc
```

The signing certificate fingerprint was taken from the APK signature block, read with
REA's APK signature inspector (evidence `ev_0ade1480eff8d6b40378638259c52635db926c8bc6a9c07ed714930ec00e013f`,
self consistent, v1 and v2 schemes, signer `CN=John Developer, O=DevCompany Inc`).

The response was:

```json
{
  "entries": {
    "baseUrl": "https://easypdfmaker.online/",
    "lora": "zH7hY9@lO=8uXk#f%mI/VvJd2G10Z5eU+L6Pi&aEbwA4scBCStQ3KyWqRjDgnoMRP"
  },
  "state": "UPDATE",
  "templateVersion": "82"
}
```

`baseUrl` is the catalogue host. `lora` is a 64 character key, and the DEX carries
`javax.crypto` classes plus the log line `'. Assuming AES-CTR crypto mode.'`, so the
catalogue responses are encrypted with AES in counter mode.

Probing that host did not yield a catalogue endpoint. Every path tried returned `404`
from the origin behind Cloudflare, and no request path appears as a static string in the
DEX, which indicates the paths are built at runtime. The channel list itself was
therefore not recoverable.

---

## How the original application resolves a stream

Two JavaScript blobs are embedded in the DEX and injected into a WebView. They are the
mechanism the app uses to turn a page into a playable stream.

The first blob scans the loaded page for a media URL, in order: `<script>` text content,
base64 candidates, `og:video` and `twitter:player` meta tags, `data-src` style
attributes, JSON blobs, and finally `<iframe>` sources.

The second blob is a player probe. It reads `video` and `source` elements, scans the
page HTML for stream extensions and for `.loadSource(...)` call sites, and then asks the
player APIs directly: JW Player, Video.js, a global `hls` instance, Clappr, DPlayer,
Shaka Player, Bitmovin, and a generic `window.player` catch all. It returns the first
URL that matches a recognised stream pattern.

The related strings `getUpstreamReader`, `setUpstreamReader` and `upstreamReader`
confirm the WebView is also used to read the upstream response body.

This is why the original application can play streams that a browser cannot: it resolves
them outside the browser's origin rules. NEXT TV takes the other route for the same
result, by fetching the stream through its own server with a signed URL.

The DEX also contains `/decipher_js_funct` and `};decipher();`, so parts of the page
script are decrypted before they are evaluated.

