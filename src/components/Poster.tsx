"use client";

/**
 * Poster tile.
 *
 * Channels carry their own logo from the public directory, so the logo is
 * shown when it loads. Behind it sits a generated slate (a tinted panel with
 * ghosted initials and the name) which is also the fallback when a logo is
 * missing or fails to load, so a tile is never empty.
 */

const TINTS = [
  { h: 212, s: 14 },
  { h: 196, s: 12 },
  { h: 232, s: 13 },
  { h: 168, s: 10 },
  { h: 258, s: 11 },
  { h: 24, s: 10 },
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 31 + text.charCodeAt(i)) >>> 0;
  }
  return h;
}

function initials(title: string): string {
  const words = title
    .split(/\s+/)
    .filter((word) => /[A-Za-z0-9]/.test(word))
    .slice(0, 2);
  if (words.length === 0) return "??";
  return words.map((word) => word[0].toUpperCase()).join("");
}

export function Poster({
  title,
  tag,
  live = false,
  compact = false,
  image,
}: {
  title: string;
  tag?: string;
  live?: boolean;
  compact?: boolean;
  image?: string;
}) {
  const seed = hash(title);
  const tint = TINTS[seed % TINTS.length];

  return (
    <div
      className={compact ? "poster poster--compact" : "poster"}
      style={{
        background: `linear-gradient(150deg, hsl(${tint.h} ${tint.s}% 15%), hsl(${tint.h} ${tint.s}% 8%))`,
      }}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="poster__img"
          src={image}
          alt=""
          width={320}
          height={180}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}

      {image ? null : (
        <span
          className="poster__ghost"
          aria-hidden="true"
          style={{ color: `hsl(${tint.h} ${tint.s}% 27%)` }}
        >
          {initials(title)}
        </span>
      )}

      {compact ? null : (
        <div className="poster__fill">
          {tag ? <span className="poster__tag">{tag}</span> : null}
          <span className="poster__word">{title}</span>
        </div>
      )}

      {live ? <span className="poster__corner" aria-hidden="true" /> : null}
    </div>
  );
}
