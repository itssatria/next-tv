"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@/components/Dialog";
import { IconGift, IconInfo, IconTelegram } from "@/components/Icons";
import { Switch } from "@/components/Switch";
import {
  clearAllStorage,
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  type StoredSettings,
} from "@/lib/storage";
import type { AppConfig, Catalog } from "@/lib/types";

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  updateUrl: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<StoredSettings>(DEFAULT_SETTINGS);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );

  useEffect(() => {
    setSettings(getSettings());

    void fetch("/api/update", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: UpdateInfo) => setUpdate(body))
      .catch(() => setUpdate(null));

    void fetch("/api/config", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: AppConfig) => setConfig(body))
      .catch(() => setConfig(null));

    void fetch("/api/catalog", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: Catalog) => setCatalog(body))
      .catch(() => setCatalog(null));

    if (typeof Notification !== "undefined") {
      setNotifications(Notification.permission);
    }
  }, []);

  const updateSetting = useCallback(
    <K extends keyof StoredSettings>(key: K, value: StoredSettings[K]) => {
      setSettings((current) => {
        const next = { ...current, [key]: value };
        saveSettings(next);
        return next;
      });
    },
    [],
  );

  async function toggleNotifications(enabled: boolean) {
    if (typeof Notification === "undefined") {
      setNotice("This browser does not support notifications.");
      return;
    }

    if (!enabled) {
      setNotifications(Notification.permission);
      setNotice("Notifications stay enabled until they are turned off in the browser settings.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotifications(permission);

    if (permission === "granted") {
      new Notification("NEXT TV", { body: "Match alerts are now switched on." });
      setNotice("Notifications are on.");
    } else {
      setNotice("Notification permission was not granted.");
    }
  }

  function clearData() {
    clearAllStorage();
    setSettings(DEFAULT_SETTINGS);
    setConfirmClear(false);
    setNotice("Stored favourites, imported playlists and settings were cleared.");
  }

  const communityLinks = [
    {
      key: "telegram",
      title: "Telegram channel",
      description: "Stay updated with latest matches and updates",
      url: config?.telegramUrl ?? "",
      Icon: IconTelegram,
      label: "Open",
    },
    {
      key: "donate",
      title: "Donate",
      description: "Help us keep the app running",
      url: config?.sponsor?.url ?? "",
      Icon: IconGift,
      label: "Donate",
    },
    {
      key: "more",
      title: "More apps",
      description: "Discover our other apps",
      url: config?.moreAppsUrl ?? "",
      Icon: IconInfo,
      label: "Open",
    },
  ].filter((entry) => entry.url.length > 0);

  return (
    <>
      <div className="pagehead">
        <h1 className="pagehead__title">Settings</h1>
        <p className="pagehead__sub">Stored on this device</p>
      </div>

      {notice ? (
        <p className="notice notice--neutral" style={{ marginBottom: 18 }}>
          {notice}
        </p>
      ) : null}

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Streaming</h2>
        </div>

        <div className="settinggroup">
          <div className="setting">
            <div className="setting__text">
              <div className="setting__title">Force low quality</div>
              <div className="setting__desc">Save data on slow connections</div>
            </div>
            <div className="setting__control">
              <Switch
                checked={settings.forceLowQuality}
                onChange={(value) => updateSetting("forceLowQuality", value)}
                label="Force low quality"
              />
            </div>
          </div>

          <div className="setting">
            <div className="setting__text">
              <div className="setting__title">Sort favourites</div>
              <div className="setting__desc">Order favourites by name instead of by date added</div>
            </div>
            <div className="setting__control">
              <Switch
                checked={settings.sortFavourites}
                onChange={(value) => updateSetting("sortFavourites", value)}
                label="Sort favourites by name"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Alerts</h2>
        </div>

        <div className="settinggroup">
          <div className="setting">
            <div className="setting__text">
              <div className="setting__title">Match notifications</div>
              <div className="setting__desc">
                {notifications === "unsupported"
                  ? "This browser does not support notifications"
                  : notifications === "granted"
                    ? "Permission granted"
                    : "Permission needed"}
              </div>
            </div>
            <div className="setting__control">
              <Switch
                checked={notifications === "granted"}
                onChange={(value) => void toggleNotifications(value)}
                label="Match notifications"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Channel directory</h2>
        </div>

        <div className="settinggroup">
          <div className="setting">
            <div className="setting__text">
              <div className="setting__title">Source</div>
              <div className="setting__desc">
                {catalog
                  ? `${catalog.totalChannels.toLocaleString()} channels, ${catalog.source}`
                  : "Loading the directory"}
              </div>
            </div>
            <div className="setting__control">
              <a
                className="btn btn--sm"
                href="https://github.com/iptv-org/iptv"
                target="_blank"
                rel="noreferrer noopener"
              >
                Directory
              </a>
            </div>
          </div>

          <div className="setting">
            <div className="setting__text">
              <div className="setting__title">Your own channels</div>
              <div className="setting__desc">
                Import an M3U playlist to add channels the directory does not carry
              </div>
            </div>
            <div className="setting__control">
              <Link href="/playlists" className="btn btn--sm">
                Playlists
              </Link>
            </div>
          </div>
        </div>
      </section>

      {communityLinks.length > 0 ? (
        <section className="section">
          <div className="section__head">
            <h2 className="section__title">Community</h2>
          </div>

          <div className="settinggroup">
            {communityLinks.map(({ key, title, description, url, Icon, label }) => (
              <div className="setting" key={key}>
                <div className="setting__text">
                  <div className="setting__title">{title}</div>
                  <div className="setting__desc">{description}</div>
                </div>
                <div className="setting__control">
                  <a
                    className="btn btn--sm"
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <Icon size={16} />
                    {label}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">About</h2>
        </div>

        <div className="settinggroup">
          <div className="setting">
            <div className="setting__text">
              <div className="setting__title">Version</div>
              <div className="setting__desc mono">
                {update ? `installed ${update.currentVersion}` : "checking..."}
              </div>
            </div>
            <div className="setting__control">
              {update?.updateAvailable && update.updateUrl ? (
                <a
                  className="btn btn--sm btn--accent"
                  href={update.updateUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Update Now
                </a>
              ) : (
                <span className="muted" style={{ fontSize: 13 }}>
                  {update ? "Up to date" : ""}
                </span>
              )}
            </div>
          </div>

          <div className="setting">
            <div className="setting__text">
              <div className="setting__title">About this app</div>
              <div className="setting__desc">What it does, and the licences it uses</div>
            </div>
            <div className="setting__control">
              <Link href="/about" className="btn btn--sm">
                Open
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Data</h2>
        </div>

        <div className="settinggroup">
          <div className="setting">
            <div className="setting__text">
              <div className="setting__title">Clear data</div>
              <div className="setting__desc">
                Removes favourites, imported playlists and settings from this browser
              </div>
            </div>
            <div className="setting__control">
              <button type="button" className="btn btn--sm" onClick={() => setConfirmClear(true)}>
                Clear Data
              </button>
            </div>
          </div>
        </div>
      </section>

      <Dialog
        open={confirmClear}
        title="Clear data"
        onClose={() => setConfirmClear(false)}
        footer={
          <>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setConfirmClear(false)}
            >
              Cancel
            </button>
            <button type="button" className="btn btn--sm btn--accent" onClick={clearData}>
              Clear
            </button>
          </>
        }
      >
        <p style={{ margin: 0 }}>
          Are you sure, you want to clear all stored data? Favourites, imported playlists and
          settings will be removed from this browser.
        </p>
      </Dialog>
    </>
  );
}
