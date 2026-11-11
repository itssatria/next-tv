import Link from "next/link";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const LICENCES = [
  ["Next.js", "MIT", "https://github.com/vercel/next.js"],
  ["React", "MIT", "https://github.com/facebook/react"],
  ["hls.js", "BSD-3-Clause", "https://github.com/video-dev/hls.js"],
  ["TypeScript", "Apache-2.0", "https://github.com/microsoft/TypeScript"],
];

export default async function AboutPage() {
  const catalog = await getCatalog();

  return (
    <>
      <Link href="/live" className="backlink">
        Back to live channels
      </Link>

      <div className="pagehead">
        <h1 className="pagehead__title">About</h1>
        <p className="pagehead__sub">NEXT TV</p>
      </div>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">What it does</h2>
        </div>
        <p className="prose">
          NEXT TV is a browser player for live television. It browses a public directory of live
          channels, plays them with HLS in the browser, and lets you import your own M3U
          playlists so the guide reflects the channels you actually watch.
        </p>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Channel directory</h2>
        </div>
        <p className="prose">
          The guide is built from the public iptv-org index, a community maintained list of
          publicly reachable streams. The directory currently carries{" "}
          <b>{catalog.totalChannels.toLocaleString()}</b> channels across{" "}
          <b>{catalog.categories.length}</b> categories. Individual streams come from third
          party providers and some of them are geo restricted or go offline without notice,
          which is why a stream can fail to open.
        </p>
        <p className="prose">
          Your own channels can be added on the Playlists screen by importing an M3U address.
          Imported playlists stay in this browser and are never sent anywhere.
        </p>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Content</h2>
        </div>
        <p className="prose">
          NEXT TV does not host any channels. Every stream link comes from a third party
          website that publishes it freely on the internet. This project only provides a way to
          reach them, and all content remains the copyright of its owner.
        </p>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Licences</h2>
        </div>
        <div className="rows">
          {LICENCES.map(([name, licence, url]) => (
            <a
              key={name}
              href={url}
              className="row"
              target="_blank"
              rel="noreferrer noopener"
              data-focusable
            >
              <span className="row__thumb" style={{ display: "grid", placeItems: "center" }}>
                <span className="mono muted" style={{ fontSize: 12 }}>
                  {licence}
                </span>
              </span>
              <span>
                <span className="row__title">{name}</span>
                <span className="row__meta">
                  <span>{licence}</span>
                </span>
              </span>
              <span className="row__right" />
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
