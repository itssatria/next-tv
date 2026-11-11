import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Fixture feed.
 *
 * The original Android app opened on a Live Events screen listing what was on
 * now and what was coming up. This module rebuilds that screen from ESPN's
 * public scoreboard API, which returns real fixtures with real kick off times
 * and a live status, so the titles on the screen are genuine.
 */

const SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports";

/**
 * Leagues queried one day at a time. The endpoint answers a date range only
 * for some leagues, so the daily form is used where it works.
 */
const DAILY_LEAGUES: Array<[string, string, string]> = [
  ["basketball/nba", "NBA", "Sports"],
  ["basketball/wnba", "WNBA", "Sports"],
  ["hockey/nhl", "NHL", "Sports"],
  ["tennis/atp", "ATP", "Sports"],
  ["tennis/wta", "WTA", "Sports"],
  ["golf/pga", "PGA Tour", "Sports"],
  ["americanfootball/nfl", "NFL", "Sports"],
  ["soccer/mex.1", "Liga MX", "Sports"],
  ["soccer/bra.1", "Brasileirao", "Sports"],
  ["soccer/eng.3", "League One", "Sports"],
  ["soccer/esp.2", "Segunda Division", "Sports"],
  ["soccer/arg.1", "Argentina Primera", "Sports"],
  ["soccer/usa.1", "MLS", "Sports"],
  ["racing/f1", "Formula 1", "Auto"],
];

/**
 * Leagues whose daily endpoint is empty. Their latest slate is requested
 * instead, which is where a match in progress shows up.
 */
const SLATE_LEAGUES: Array<[string, string, string]> = [
  ["soccer/eng.1", "Premier League", "Sports"],
  ["soccer/eng.2", "Championship", "Sports"],
  ["soccer/esp.1", "La Liga", "Sports"],
  ["soccer/ger.1", "Bundesliga", "Sports"],
  ["soccer/ita.1", "Serie A", "Sports"],
  ["soccer/fra.1", "Ligue 1", "Sports"],
  ["soccer/ned.1", "Eredivisie", "Sports"],
  ["soccer/por.1", "Primeira Liga", "Sports"],
  ["soccer/tur.1", "Super Lig", "Sports"],
  ["soccer/sco.1", "Scottish Premiership", "Sports"],
  ["soccer/uefa.champions", "Champions League", "Sports"],
  ["soccer/uefa.europa", "Europa League", "Sports"],
  ["soccer/jpn.1", "J1 League", "Sports"],
  ["soccer/fifa.world", "World Cup", "Sports"],
];

const HORIZON_DAYS = 7;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_DIR = path.join(process.cwd(), "data", ".cache");
const CONCURRENCY = 10;

export interface Fixture {
  id: string;
  /** "Toronto Raptors at Philadelphia 76ers" */
  name: string;
  /** "NBA" */
  competition: string;
  /** "Basketball" */
  sport: string;
  startsAt: string;
  status: "live" | "upcoming" | "finished";
  /** "PHI 110 - TOR 105" */
  score?: string;
  /** Directory category to browse for this sport. */
  category: string;
  /** Team names, used to look for a dedicated channel. */
  teams: string[];
}

export interface FixtureFeed {
  live: Fixture[];
  upcoming: Fixture[];
  finished: Fixture[];
  updatedAt: number;
}

interface EspnEvent {
  id?: string;
  date?: string;
  name?: string;
  shortName?: string;
  status?: { type?: { state?: string } };
  competitions?: Array<{
    competitors?: Array<{ team?: { abbreviation?: string; displayName?: string }; score?: string }>;
    status?: { type?: { state?: string } };
  }>;
}

function datesAhead(count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(Date.now() + i * 86_400_000);
    out.push(
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  return out;
}

function sportOf(path: string): string {
  const [sport] = path.split("/");
  const names: Record<string, string> = {
    soccer: "Football",
    basketball: "Basketball",
    "americanfootball": "American Football",
    hockey: "Ice Hockey",
    tennis: "Tennis",
    golf: "Golf",
    racing: "Motorsport",
  };
  return names[sport] ?? "Sport";
}

function toFixture(
  event: EspnEvent,
  competition: string,
  category: string,
  path: string,
): Fixture | null {
  if (!event.date || !event.name) return null;

  const state = event.competitions?.[0]?.status?.type?.state ?? event.status?.type?.state;
  if (!state) return null;

  const status: Fixture["status"] =
    state === "in" ? "live" : state === "pre" ? "upcoming" : "finished";

  const competitors = event.competitions?.[0]?.competitors ?? [];
  const teams = competitors
    .map((c) => c.team?.displayName ?? c.team?.abbreviation ?? "")
    .filter(Boolean);
  const score =
    status === "live" || status === "finished"
      ? competitors
          .map((c) => `${c.team?.abbreviation ?? "?"} ${c.score ?? ""}`.trim())
          .join(" - ")
      : undefined;

  return {
    id: `${path}:${event.id ?? event.date}:${event.name}`,
    name: event.name,
    competition,
    sport: sportOf(path),
    startsAt: event.date,
    status,
    score,
    category,
    teams,
  };
}

async function fetchEvents(url: string): Promise<EspnEvent[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "NEXT-TV/1.7" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { events?: EspnEvent[] };
    return body.events ?? [];
  } catch {
    return [];
  }
}

async function buildFeed(): Promise<FixtureFeed> {
  const dates = datesAhead(HORIZON_DAYS);

  const jobs: Array<{ url: string; path: string; competition: string; category: string }> = [];

  for (const [path, competition, category] of DAILY_LEAGUES) {
    for (const date of dates) {
      jobs.push({
        url: `${SCOREBOARD}/${path}/scoreboard?dates=${date}`,
        path,
        competition,
        category,
      });
    }
  }

  for (const [path, competition, category] of SLATE_LEAGUES) {
    jobs.push({ url: `${SCOREBOARD}/${path}/scoreboard`, path, competition, category });
  }

  const fixtures: Fixture[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      const events = await fetchEvents(job.url);
      for (const event of events) {
        const fixture = toFixture(event, job.competition, job.category, job.path);
        if (fixture) fixtures.push(fixture);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // One event can be returned by more than one request, keep the first.
  const unique = new Map<string, Fixture>();
  for (const fixture of fixtures) {
    if (!unique.has(fixture.id)) unique.set(fixture.id, fixture);
  }

  const all = [...unique.values()];
  const now = Date.now();

  const live = all
    .filter((f) => f.status === "live")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const upcoming = all
    .filter((f) => f.status === "upcoming" && new Date(f.startsAt).getTime() >= now - 3 * 3600_000)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 40);

  const finished = all
    .filter(
      (f) =>
        f.status === "finished" &&
        new Date(f.startsAt).getTime() > now - 72 * 3600_000,
    )
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .slice(0, 12);

  return { live, upcoming, finished, updatedAt: Date.now() };
}

let cached: FixtureFeed | null = null;
let inflight: Promise<FixtureFeed> | null = null;

async function readDiskCache(): Promise<FixtureFeed | null> {
  try {
    const file = path.join(CACHE_DIR, "fixtures.json");
    const stat = await fs.stat(file);
    if (Date.now() - stat.mtimeMs > CACHE_TTL_MS) return null;
    return JSON.parse(await fs.readFile(file, "utf8")) as FixtureFeed;
  } catch {
    return null;
  }
}

async function writeDiskCache(feed: FixtureFeed): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(path.join(CACHE_DIR, "fixtures.json"), JSON.stringify(feed), "utf8");
  } catch {
    // A read only checkout still works, the feed is just refetched.
  }
}

export async function getFixtures(): Promise<FixtureFeed> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    const disk = await readDiskCache();
    if (disk) {
      cached = disk;
      return disk;
    }

    try {
      const feed = await buildFeed();
      cached = feed;
      await writeDiskCache(feed);
      return feed;
    } catch {
      return { live: [], upcoming: [], finished: [], updatedAt: Date.now() };
    }
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
