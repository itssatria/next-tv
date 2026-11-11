export function formatClock(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}

/** "in 45 min", "in 2 h 10", "Live", "started 38 min ago". */
export function formatRelative(date: Date | string, now: Date = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const deltaMs = d.getTime() - now.getTime();
  const abs = Math.abs(deltaMs);
  const minutes = Math.round(abs / 60_000);
  const past = deltaMs < 0;

  if (abs < 60_000) return past ? "just now" : "starting now";

  if (minutes < 60) return past ? `${minutes} min ago` : `in ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) {
    const text = rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
    return past ? `${text} ago` : `in ${text}`;
  }

  const days = Math.round(hours / 24);
  if (days === 1) return past ? "yesterday" : "tomorrow";
  return past ? `${days} days ago` : `in ${days} days`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
