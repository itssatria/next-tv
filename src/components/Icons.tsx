/**
 * Icon set for the player and navigation chrome.
 *
 * Reason for a hand drawn set instead of an icon library: the stock
 * thin-rounded library look reads as consumer app chrome. These are drawn on a
 * square cap, 2px stroke grid so they sit with the broadcast panel edges, and
 * every glyph maps to a concrete object (a TV, a category grid, a gear).
 */

type IconProps = {
  size?: number;
  className?: string;
};

function Svg({
  size = 20,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function IconLive(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="6.5" width="19" height="13" />
      <path d="M8 2.5h8" />
      <path d="M12 10.5v5M9.5 13h5" />
    </Svg>
  );
}

export function IconCategory(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7.5" height="7.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" />
    </Svg>
  );
}

export function IconHighlight(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" />
      <path d="M10 9.5l5 2.5-5 2.5z" />
    </Svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" />
    </Svg>
  );
}

export function IconStar({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...props}>
      <path
        d="M12 3.5l2.6 5.6 6 .8-4.4 4.2 1.1 6.1L12 17.3l-5.3 2.9 1.1-6.1L3.4 9.9l6-.8z"
        fill={filled ? "currentColor" : "none"}
      />
    </Svg>
  );
}

/** Favourites use a star, matching the APK's `favorites` table semantics. */
export function IconFavourite(props: IconProps & { filled?: boolean }) {
  return <IconStar filled={props.filled} {...props} />;
}

export function IconSearch(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.8 15.8L21 21" />
    </Svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 4.5l12 7.5-12 7.5z" fill="currentColor" />
    </Svg>
  );
}

export function IconPause(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 4.5v15M16 4.5v15" strokeWidth={3} />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 5l14 14M19 5L5 19" />
    </Svg>
  );
}

export function IconBack(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14.5 4.5L7 12l7.5 7.5" />
    </Svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 4.5L16.5 12 9 19.5" />
    </Svg>
  );
}

export function IconTelegram(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 4.5L3 11l5 2 2 6 3.5-4.5L18 18z" />
      <path d="M21 4.5L8 13" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12.5l5 5 10-11" />
    </Svg>
  );
}

export function IconList(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </Svg>
  );
}

export function IconFullscreen(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 9V3.5H9M15 3.5h5.5V9M20.5 15v5.5H15M9 20.5H3.5V15" />
    </Svg>
  );
}

export function IconPip(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="4.5" width="19" height="15" />
      <rect x="12" y="11" width="8" height="7" />
    </Svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5v11M7.5 10.5L12 15l4.5-4.5" />
      <path d="M4 19.5h16" />
    </Svg>
  );
}

export function IconShare(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="17.5" cy="5.5" r="2.5" />
      <circle cx="17.5" cy="18.5" r="2.5" />
      <path d="M8.2 10.8l7.1-4M8.2 13.2l7.1 4" />
    </Svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20.5 3v5h-5" />
    </Svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6.5h16M9.5 6.5V4h5v2.5M6.5 6.5L7.5 20h9l1-13.5" />
    </Svg>
  );
}

export function IconGift(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 11.5h17v9h-17z" />
      <path d="M2.5 7.5h19v4h-19zM12 7.5v13" />
      <path d="M12 7.5S10.5 3 8 3a2.2 2.2 0 0 0 0 4.5zM12 7.5S13.5 3 16 3a2.2 2.2 0 0 1 0 4.5z" />
    </Svg>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10.5v6M12 7.5v.6" />
    </Svg>
  );
}
