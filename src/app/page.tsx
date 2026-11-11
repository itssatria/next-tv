"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => router.replace("/events"), 1100);
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <div className="splash">
      <p className="splash__word">
        NEXT<span>TV</span>
      </p>
      <span className="splash__rule" aria-hidden="true" />
      <p className="splash__tag">
        Live channels, fixtures and highlights, laid out for the big screen.
      </p>
      <p className="muted" style={{ fontSize: 12, maxWidth: "54ch" }}>
        Channel listings ship with this build. Import an M3U playlist or point the server at
        a live API to add your own.
      </p>
      <noscript>
        <p className="notice">JavaScript is required for the player and the channel browser.</p>
      </noscript>
    </div>
  );
}
