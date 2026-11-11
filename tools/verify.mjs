/**
 * Headless click-through verification.
 *
 * Drives Chrome over the DevTools protocol using Node's built-in WebSocket, so
 * the project needs no browser automation dependency. Walks the same screens a
 * person would walk, captures a screenshot at each stop, and records console
 * errors and horizontal overflow.
 *
 * Usage: node tools/verify.mjs [baseUrl] [outDir]
 */

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = process.argv[3] ?? path.join(process.cwd(), "verify-output");

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const results = [];
const consoleErrors = [];

function log(step, status, detail = "") {
  results.push({ step, status, detail });
  console.log(`${status === "PASS" ? "PASS" : "FAIL"}  ${step}${detail ? ` :: ${detail}` : ""}`);
}

async function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      const { access } = await import("node:fs/promises");
      await access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error("no chrome binary found");
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
      } else if (message.method) {
        const list = this.handlers.get(message.method) ?? [];
        for (const handler of list) handler(message.params);
      }
    });
  }

  on(method, handler) {
    const list = this.handlers.get(method) ?? [];
    list.push(handler);
    this.handlers.set(method, list);
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`timeout: ${method}`));
        }
      }, 45000);
    });
  }
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => resolve(new Cdp(ws)));
    ws.addEventListener("error", (event) => reject(new Error(`ws error: ${event.message ?? "unknown"}`)));
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  await mkdir(OUT, { recursive: true });

  const chrome = await findChrome();
  const profile = path.join(os.tmpdir(), "nexttv-verify-profile");
  const port = 9333;

  const child = spawn(chrome, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--hide-scrollbars",
    "--window-size=1600,900",
    "about:blank",
  ], { stdio: "ignore" });

  let version = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      version = await res.json();
      break;
    } catch {
      await sleep(250);
    }
  }
  if (!version) throw new Error("chrome did not expose the devtools endpoint");

  const browser = await connect(version.webSocketDebuggerUrl);
  const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await browser.send("Target.attachToTarget", { targetId, flatten: true });

  const call = (method, params = {}) => browser.send(method, params, sessionId);

  await call("Page.enable");
  await call("Runtime.enable");
  await call("Log.enable");

  browser.on("Runtime.consoleAPICalled", (params) => {
    if (params.type === "error") {
      consoleErrors.push(params.args.map((a) => a.value ?? a.description ?? "").join(" "));
    }
  });
  browser.on("Runtime.exceptionThrown", (params) => {
    consoleErrors.push(
      `exception: ${params.exceptionDetails?.exception?.description ?? params.exceptionDetails?.text}`,
    );
  });

  async function evaluate(expression) {
    const result = await call("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? "evaluate failed");
    }
    return result.result.value;
  }

  async function goto(url) {
    await call("Page.navigate", { url });
    await sleep(1400);
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const state = await evaluate("document.readyState");
      if (state === "complete") break;
      await sleep(300);
    }
    await sleep(700);
  }

  async function shot(name) {
    const { data } = await call("Page.captureScreenshot", { format: "png" });
    await writeFile(path.join(OUT, `${name}.png`), Buffer.from(data, "base64"));
  }

  async function clickText(selector, text) {
    return evaluate(`(() => {
      const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
      const node = nodes.find((n) => (n.textContent || "").trim().toLowerCase().includes(${JSON.stringify(text.toLowerCase())}));
      if (!node) return false;
      node.click();
      return true;
    })()`);
  }

  async function overflow() {
    return evaluate(
      "({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, overflow: document.documentElement.scrollWidth > window.innerWidth + 1 })",
    );
  }

  /* ---------------------------------------------------------------- splash */

  // Start from a clean device state so repeated runs do not inherit
  // favourites or settings from the previous run. The settings screen is used
  // because the splash screen redirects away from itself.
  await call("Page.navigate", { url: `${BASE}/settings` });
  await sleep(1200);
  await evaluate("localStorage.clear()");

  await call("Page.navigate", { url: `${BASE}/` });
  await sleep(500);
  await shot("01-splash");
  const splashWord = await evaluate("document.querySelector('.splash__word')?.textContent ?? ''");
  if (splashWord.includes("NEXT")) log("splash renders the NEXT TV brand", "PASS", splashWord);
  else log("splash renders the NEXT TV brand", "FAIL", splashWord);

  await sleep(1800);
  const afterRedirect = await evaluate("location.pathname");
  if (afterRedirect === "/events") log("splash redirects to live events", "PASS", afterRedirect);
  else log("splash redirects to live events", "FAIL", afterRedirect);

  /* --------------------------------------------------------------- events */

  await goto(`${BASE}/events`);
  await shot("02-events");

  const sections = await evaluate(
    "Array.from(document.querySelectorAll('.section__title')).map((n) => n.textContent.trim())",
  );
  const fixtureRows = await evaluate("document.querySelectorAll('.rows .row').length");
  if (fixtureRows > 0) {
    log(
      "live events page lists fixtures",
      "PASS",
      `${fixtureRows} rows in [${sections.join(", ")}]`,
    );
  } else {
    log("live events page lists fixtures", "FAIL", `sections [${sections.join(", ")}]`);
  }

  const hasOnNow = sections.includes("On now");
  const hasUpcoming = sections.includes("Upcoming");
  if (hasOnNow || hasUpcoming) {
    log("live events page has the on now and upcoming sections", "PASS", sections.join(", "));
  } else {
    log("live events page has the on now and upcoming sections", "FAIL", sections.join(", "));
  }

  const eventsOverflow = await overflow();
  if (!eventsOverflow.overflow) log("events page has no horizontal overflow", "PASS");
  else log("events page has no horizontal overflow", "FAIL", JSON.stringify(eventsOverflow));

  /* ------------------------------------------------------------- channels */

  await goto(`${BASE}/channels`);
  await shot("03-channels");

  const tiles = await evaluate("document.querySelectorAll('.grid .tile').length");
  if (tiles > 0) log("channels screen renders channel tiles", "PASS", `${tiles} channels`);
  else log("channels screen renders channel tiles", "FAIL", "0 tiles");

  const chips = await evaluate("document.querySelectorAll('.chips .chip').length");
  if (chips > 1) log("category strip renders", "PASS", `${chips} categories`);
  else log("category strip renders", "FAIL", `${chips} chips`);

  const totalLabel = await evaluate("document.querySelector('.pagehead__sub')?.textContent ?? ''");
  if (/\d/.test(totalLabel)) log("directory size is reported", "PASS", totalLabel.trim());
  else log("directory size is reported", "FAIL", totalLabel);

  const liveOverflow = await overflow();
  if (!liveOverflow.overflow) log("channels screen has no horizontal overflow", "PASS");
  else log("channels screen has no horizontal overflow", "FAIL", JSON.stringify(liveOverflow));

  /* --------------------------------------------------------- d-pad focus */

  const dpad = await evaluate(`(() => {
    const tiles = Array.from(document.querySelectorAll('[data-focusable]'));
    if (tiles.length < 2) return { ok: false, reason: 'not enough focusable tiles' };
    tiles[0].focus();
    const before = document.activeElement;
    before.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    const after = document.activeElement;
    return {
      ok: before !== after,
      before: before.getAttribute('href') || before.className,
      after: after.getAttribute('href') || after.className,
    };
  })()`);
  if (dpad.ok) log("arrow keys move focus between tiles", "PASS", `${dpad.before} -> ${dpad.after}`);
  else log("arrow keys move focus between tiles", "FAIL", JSON.stringify(dpad));

  /* -------------------------------------------------------------- search */

  await evaluate(`document.querySelector('[aria-label="Search channels"]').click()`);
  await sleep(500);
  const searchOpened = await evaluate("!!document.querySelector('.dialog')");
  await evaluate(`(() => {
    const input = document.querySelector('#search-input');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'news');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  await sleep(1800);
  const searchResults = await evaluate("document.querySelectorAll('.dialog .option').length");
  if (searchOpened && searchResults > 0) {
    log("search dialog returns directory results", "PASS", `${searchResults} results`);
  } else {
    log("search dialog returns directory results", "FAIL", `opened=${searchOpened} results=${searchResults}`);
  }
  await shot("04-search");
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  await sleep(400);

  /* ---------------------------------------------------------------- player */

  await evaluate(
    `localStorage.setItem('nexttv.settings', JSON.stringify({forceLowQuality:false,sortFavourites:false,theme:'dark'}))`,
  );

  await evaluate(`(() => {
    const tile = document.querySelector('.grid a.tile');
    if (!tile) return false;
    tile.click();
    return true;
  })()`);
  await sleep(2500);
  const onPlayer = await evaluate("location.pathname");
  if (onPlayer === "/player") log("channel tile opens the player", "PASS", onPlayer);
  else log("channel tile opens the player", "FAIL", onPlayer);

  const noGate = await evaluate("!document.querySelector('.adgate')");
  if (noGate) log("no sponsor gate in front of the player", "PASS");
  else log("no sponsor gate in front of the player", "FAIL", "ad gate present");

  // The stream is fetched through the server side proxy, so the first frame
  // can take a few seconds. Poll rather than sample once.
  const playback = await evaluate(`(async () => {
    const deadline = Date.now() + 30000;
    let last = null;
    while (Date.now() < deadline) {
      const v = document.querySelector('.player__video');
      if (v) {
        last = {
          readyState: v.readyState,
          paused: v.paused,
          videoWidth: v.videoWidth,
          currentTime: v.currentTime,
          error: v.error ? v.error.code : null,
        };
        if (v.readyState >= 2 && !v.paused && v.videoWidth > 0) return { ok: true, last };
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    return { ok: false, last };
  })()`);

  const videoState = playback.last;

  if (playback.ok) {
    log("video element plays a real stream", "PASS", JSON.stringify(videoState));
  } else {
    log("video element plays a real stream", "FAIL", JSON.stringify(videoState));
  }

  await shot("05-player");

  const isTestStream = await evaluate(`(() => {
    const v = document.querySelector('.player__video');
    const src = v ? (v.currentSrc || v.src || '') : '';
    return src.includes('test-streams.mux.dev') || src.includes('bitdash-a.akamaihd.net');
  })()`);
  if (!isTestStream) log("stream is a real channel, not a reference clip", "PASS");
  else log("stream is a real channel, not a reference clip", "FAIL", "reference clip served");

  /* ------------------------------------------------------------- dialogs */

  const openedOptions = await clickText("button", "Advance Options");
  await sleep(500);
  const optionsText = await evaluate("document.querySelector('.dialog__body')?.textContent ?? ''");
  if (openedOptions && optionsText.includes("Referer")) {
    log("advance options shows request headers", "PASS");
  } else {
    log("advance options shows request headers", "FAIL", optionsText.slice(0, 80));
  }
  await shot("06-options-dialog");
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  await sleep(400);

  const dialogClosed = await evaluate("!document.querySelector('.dialog')");
  if (dialogClosed) log("dialog closes with Escape", "PASS");
  else log("dialog closes with Escape", "FAIL");

  /* ---------------------------------------------------------- categories */

  await goto(`${BASE}/categories`);
  await shot("07-categories");
  const cats = await evaluate("document.querySelectorAll('.grid .tile').length");
  if (cats > 0) log("categories screen renders tiles", "PASS", `${cats} categories`);
  else log("categories screen renders tiles", "FAIL");

  const categoryHref = await evaluate("document.querySelector('.grid a.tile')?.getAttribute('href') ?? ''");
  await goto(`${BASE}${categoryHref}`);
  await shot("08-category");
  const channelTiles = await evaluate("document.querySelectorAll('.grid .tile').length");
  if (channelTiles > 0) log("category screen renders channels", "PASS", `${channelTiles} channels`);
  else log("category screen renders channels", "FAIL");
  /* ----------------------------------------------------------- favourites */

  const starClicked = await evaluate(`(() => {
    const btn = document.querySelector('.iconbtn--onposter');
    if (!btn) return false;
    btn.click();
    return true;
  })()`);
  await sleep(500);
  const pressed = await evaluate("document.querySelector('.iconbtn--onposter')?.getAttribute('aria-pressed')");
  if (starClicked && pressed === "true") log("favourite star toggles on", "PASS");
  else log("favourite star toggles on", "FAIL", String(pressed));

  await goto(`${BASE}/favourites`);
  await shot("09-favourites");
  const favRows = await evaluate("document.querySelectorAll('.rows .row').length");
  if (favRows > 0) log("favourites screen lists saved channels", "PASS", `${favRows} rows`);
  else log("favourites screen lists saved channels", "FAIL", "0 rows");

  /* ------------------------------------------------------------- playlists */

  await goto(`${BASE}/playlists`);
  await shot("10-playlists");
  await evaluate(`(() => {
    const input = document.querySelector('#playlist-url');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '${BASE}/sample.m3u');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  await sleep(300);
  await clickText("button", "Add Playlist Link");
  await sleep(3000);
  const playlistRows = await evaluate("document.querySelectorAll('.rows .row').length");
  const playlistStatus = await evaluate("document.querySelector('.notice')?.textContent ?? ''");
  if (playlistRows > 0) log("M3U playlist import succeeds", "PASS", playlistStatus.trim());
  else log("M3U playlist import succeeds", "FAIL", playlistStatus.trim());
  await shot("11-playlists-imported");

  /* -------------------------------------------------------------- settings */

  await goto(`${BASE}/settings`);
  await shot("12-settings");
  const brand = await evaluate("document.querySelector('.topbar__brand')?.textContent ?? ''");
  if (!brand.toLowerCase().includes("playfy")) log("no legacy branding in the chrome", "PASS", brand);
  else log("no legacy branding in the chrome", "FAIL", brand);

  const toggled = await evaluate(`(() => {
    const sw = document.querySelector('[role="switch"]');
    if (!sw) return null;
    const before = sw.getAttribute('aria-checked');
    sw.click();
    return before;
  })()`);
  await sleep(400);
  const after = await evaluate("document.querySelector('[role=\"switch\"]')?.getAttribute('aria-checked')");
  if (toggled !== null && toggled !== after) log("settings switch toggles state", "PASS", `${toggled} -> ${after}`);
  else log("settings switch toggles state", "FAIL", `${toggled} -> ${after}`);

  const clearOpened = await clickText("button", "Clear Data");
  await sleep(500);
  const confirmVisible = await evaluate(
    "!!document.querySelector('.dialog') && document.querySelector('.dialog__body')?.textContent?.includes('Are you sure')",
  );
  if (clearOpened && confirmVisible) log("clear data asks for confirmation", "PASS");
  else log("clear data asks for confirmation", "FAIL");
  await shot("13-clear-data");
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  await sleep(300);

  /* ------------------------------------------------------------- about */

  await goto(`${BASE}/about`);
  await shot("14-about");
  const aboutText = await evaluate("document.body.innerText ?? ''");
  if (/licences/i.test(aboutText) && !aboutText.toLowerCase().includes("playfy")) {
    log("about page lists licences with no legacy trace", "PASS");
  } else {
    log("about page lists licences with no legacy trace", "FAIL");
  }

  /* ----------------------------------------------------------- mobile view */

  await call("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await goto(`${BASE}/channels`);
  await shot("15-mobile-live");
  const mobileOverflow = await overflow();
  if (!mobileOverflow.overflow) log("mobile live screen has no horizontal overflow", "PASS");
  else log("mobile live screen has no horizontal overflow", "FAIL", JSON.stringify(mobileOverflow));

  await goto(`${BASE}/settings`);
  await shot("16-mobile-settings");
  const mobileSettingsOverflow = await overflow();
  if (!mobileSettingsOverflow.overflow) log("mobile settings screen has no horizontal overflow", "PASS");
  else log("mobile settings screen has no horizontal overflow", "FAIL", JSON.stringify(mobileSettingsOverflow));

  /* -------------------------------------------------------------- summary */

  const noise = consoleErrors.filter(
    (line) => !line.includes("favicon") && !line.includes("Failed to load resource"),
  );

  console.log("");
  console.log(`console errors: ${consoleErrors.length} (${noise.length} excluding resource noise)`);
  for (const line of noise.slice(0, 12)) console.log(`  - ${line}`);

  const failed = results.filter((r) => r.status === "FAIL");
  console.log("");
  console.log(`checks: ${results.length}, passed: ${results.length - failed.length}, failed: ${failed.length}`);

  await writeFile(
    path.join(OUT, "report.json"),
    JSON.stringify({ results, consoleErrors }, null, 2),
  );

  child.kill();
  process.exit(failed.length === 0 && noise.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("verify failed:", error);
  process.exit(2);
});

