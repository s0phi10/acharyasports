export type Stream = {
  name: string;
  url: string;
};

export type SportEvent = {
  id: string;
  name: string;
  poster: string;
  category: string;
  status: "live" | "upcoming" | "24/7";
  streams: Stream[];
  /** ISO string of when this event starts (optional — enriched from ESPN). */
  startDate?: string | null;
  /** ESPN live state — "pre" | "in" | "post" | null. */
  liveState?: "pre" | "in" | "post" | null;
  /** Human-readable match detail from ESPN (e.g. "1st Test - Day 1" or "13'"). */
  matchDetail?: string | null;
  /** ESPN event id (for future linking). */
  espnId?: string | null;
  /** True if this event was discovered only from ESPN (no bintvjson stream). */
  espnOnly?: boolean;
  /** Human-readable league name (e.g. "Premier League"). */
  espnLeague?: string;
};

export type SportData = {
  success: boolean;
  generated_at?: string;
  cached?: boolean;
  counts: {
    live: number;
    upcoming: number;
    channels: number;
  };
  "Live Events": SportEvent[];
  "Upcoming Events": SportEvent[];
  "24/7 Channels": SportEvent[];
  error?: string;
};

export type EventTab = "live" | "upcoming" | "channels";
