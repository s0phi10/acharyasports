/**
 * Format an ISO date string as a readable local date + time.
 * Returns null if the input is empty/invalid.
 *
 * @param iso ISO date string
 * @returns e.g. "Sat, 18 Oct · 6:45 PM"
 */
export function formatKickoff(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const datePart = d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timePart = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}

/**
 * Format a kickoff ISO date as just the time portion.
 */
export function formatKickoffTime(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Relative-time from now, e.g. "in 3h", "in 2d", "starts in 45m", "now".
 */
export function formatRelativeKickoff(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const diffMs = d.getTime() - Date.now();
  const past = diffMs < 0;
  const abs = Math.abs(diffMs);
  const min = Math.round(abs / 60000);
  const hr = Math.round(abs / 3_600_000);
  const day = Math.round(abs / 86_400_000);

  if (abs < 60_000) return past ? "started" : "now";
  if (min < 60) return past ? `${min}m ago` : `in ${min}m`;
  if (hr < 24) return past ? `${hr}h ago` : `in ${hr}h`;
  if (day < 7) return past ? `${day}d ago` : `in ${day}d`;
  // For anything more than a week, return the absolute date
  return formatKickoff(iso);
}

/**
 * Returns a short "day label" — Today / Tomorrow / weekday / date.
 */
export function formatKickoffDay(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const today = startOfDay(now);
  const target = startOfDay(d);
  const dayMs = 86_400_000;
  const diffDays = Math.round((target - today) / dayMs);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: "long" });
  }
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
