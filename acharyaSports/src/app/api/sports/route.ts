import { NextResponse } from "next/server";

const BIN_API = "https://bintvjson.lovable.app/api/public/bintvjson";

/**
 * ESPN public scoreboard endpoints (no API key required).
 * Returns ISO dates and live status for each event.
 *
 * We hit a handful of popular soccer leagues + the cricket endpoint.
 * If any league 404s or times out, we skip it and continue.
 */
const ESPN_LEAGUES = [
  "soccer/eng.1", // English Premier League
  "soccer/esp.1", // La Liga
  "soccer/ita.1", // Serie A
  "soccer/ger.1", // Bundesliga
  "soccer/fra.1", // Ligue 1
  "soccer/uefa.champions",
  "soccer/uefa.europa",
  "soccer/usa.1", // MLS
  "soccer/mex.1",
  "soccer/ned.1",
  "soccer/por.1",
  "cricket", // international cricket
];

type EspnEvent = {
  id: string;
  date?: string;
  name?: string;
  shortName?: string;
  status?: {
    type?: { state?: string; description?: string; shortDetail?: string };
  };
  competitions?: Array<{
    date?: string;
    startDate?: string;
    status?: {
      clock?: number;
      type?: { state?: string; description?: string; shortDetail?: string };
    };
    competitors?: Array<{
      team?: { displayName?: string; name?: string; logo?: string };
      homeAway?: string;
    }>;
  }>;
  league?: { name?: string; slug?: string };
};

type BinStream = { name: string; url: string };
type BinEvent = {
  id: string;
  name: string;
  poster: string;
  category: string;
  status: string;
  streams: BinStream[];
};

/** Human-readable league name for common ESPN soccer slugs. */
function leagueSlugToLabel(slug: string): string {
  const map: Record<string, string> = {
    "soccer/eng.1": "Premier League",
    "soccer/esp.1": "La Liga",
    "soccer/ita.1": "Serie A",
    "soccer/ger.1": "Bundesliga",
    "soccer/fra.1": "Ligue 1",
    "soccer/uefa.champions": "Champions League",
    "soccer/uefa.europa": "Europa League",
    "soccer/usa.1": "MLS",
    "soccer/mex.1": "Liga MX",
    "soccer/ned.1": "Eredivisie",
    "soccer/por.1": "Primeira Liga",
    "cricket": "Cricket",
  };
  return map[slug] || slug.split("/").pop() || slug;
}

async function fetchJsonWithTimeout(url: string, ms = 4000): Promise<any | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), ms);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Pull a flat list of { date, state, name, teams, league } from an ESPN scoreboard. */
async function getEspnEvents(league: string): Promise<{ events: EspnEvent[]; leagueSlug: string }> {
  const url = `http://site.api.espn.com/apis/site/v2/sports/${league}/scoreboard`;
  const data = await fetchJsonWithTimeout(url, 4000);
  if (!data || !Array.isArray(data.events)) return { events: [], leagueSlug: league };
  const events = data.events as EspnEvent[];
  // Stash the league slug onto each event so we can label them later.
  for (const ev of events) {
    (ev as any)._leagueSlug = league;
  }
  return { events, leagueSlug: league };
}

/** Normalize team names for fuzzy matching against bintvjson events. */
function normalizeTeam(s: string = ""): string {
  return s
    .toLowerCase()
    .replace(/\b(fc|cf|sc|afc|ac|tottenham hotspur|manchester united|manchester city|real madrid|barcelona)\b/g, " ")
    .replace(/\b(women|men|w\b|m\b)\b/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Get a 2-team normalized set from a bintvjson event name like "X vs Y" or "X @ Y". */
function getBinTeams(name: string = ""): string[] {
  return name
    .split(/\s+(?:vs?\.?|@|v\.?)\s+/i)
    .map((s) => normalizeTeam(s))
    .filter(Boolean);
}

/** Get a 2-team normalized set from an ESPN event. */
function getEspnTeams(ev: EspnEvent): string[] {
  const comps = ev.competitions?.[0]?.competitors ?? [];
  if (comps.length >= 2) {
    return [
      normalizeTeam(comps[0]?.team?.displayName || comps[0]?.team?.name || ""),
      normalizeTeam(comps[1]?.team?.displayName || comps[1]?.team?.name || ""),
    ].filter(Boolean);
  }
  // fallback: parse from name "X at Y"
  return (ev.name || "")
    .split(/\s+at\s+/i)
    .map((s) => normalizeTeam(s))
    .filter(Boolean);
}

/** True if any non-trivial team token from bin appears in ESPN, and vice-versa. */
function teamsMatch(binTeams: string[], espnTeams: string[]): boolean {
  if (binTeams.length < 2 || espnTeams.length < 2) return false;
  const useful = (t: string) => t && t.length >= 3;
  const bin = new Set(binTeams.filter(useful));
  const espn = new Set(espnTeams.filter(useful));
  if (bin.size === 0 || espn.size === 0) return false;
  let hits = 0;
  for (const t of bin) if (espn.has(t)) hits++;
  // require both bin teams to be present in espn
  return hits >= 2;
}

// In-memory cache so re-fetches during a session are fast.
let cache: { at: number; data: unknown } | null = null;
const CACHE_TTL_MS = 60_000;

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.at < CACHE_TTL_MS) {
      return NextResponse.json(cache.data, {
        headers: { "Cache-Control": "no-store", "X-Acharya-Cache": "HIT" },
      });
    }

    // 1) Fetch bintvjson data
    const binRes = await fetch(BIN_API, { next: { revalidate: 60 } });
    if (!binRes.ok) {
      return NextResponse.json(
        { success: false, error: `Upstream ${binRes.status}` },
        { status: binRes.status }
      );
    }
    const binData = await binRes.json();

    // 2) Fetch ESPN events in parallel (best-effort)
    const espnResults = await Promise.all(
      ESPN_LEAGUES.map((l) => getEspnEvents(l))
    );
    const allEspn: EspnEvent[] = espnResults.flatMap((r) => r.events);

    // 3) Build a quick lookup: normalized teams → espn event
    const espnIndex: { teams: string[]; ev: EspnEvent }[] = allEspn.map((ev) => ({
      teams: getEspnTeams(ev),
      ev,
    }));

    /** Find ESPN event whose teams match this bintvjson event. */
    function findEspnMatch(binTeams: string[]): EspnEvent | undefined {
      for (const e of espnIndex) {
        if (teamsMatch(binTeams, e.teams)) return e.ev;
      }
      return undefined;
    }

    /**
     * 4) Merge: for each bintvjson event, attach ESPN date + live state if matched.
     *    Also inject ESPN "pre" (scheduled) soccer events that aren't already
     *    in bintvjson's upcoming list — these have real kickoff times.
     */
    const mergeLive = (events: BinEvent[]) =>
      (events || []).map((ev: BinEvent) => {
        const binTeams = getBinTeams(ev.name);
        const match = findEspnMatch(binTeams);
        const state = match?.status?.type?.state || null;
        const detail = match?.status?.type?.shortDetail || null;
        return {
          ...ev,
          liveState: state,
          matchDetail: detail,
          espnId: match?.id || null,
        };
      });

    const mergeUpcoming = (events: BinEvent[]) => {
      const merged = (events || []).map((ev: BinEvent) => {
        const binTeams = getBinTeams(ev.name);
        const match = findEspnMatch(binTeams);
        const startDate =
          match?.date ||
          match?.competitions?.[0]?.startDate ||
          match?.competitions?.[0]?.date ||
          null;
        const state = match?.status?.type?.state || null;
        const detail = match?.status?.type?.shortDetail || null;
        return {
          ...ev,
          startDate,
          liveState: state,
          matchDetail: detail,
          espnId: match?.id || null,
        };
      });

      // Build the set of bintvjson team-pairs we already have, to avoid duplicates.
      const binTeamKeys = new Set<string>();
      for (const ev of events || []) {
        const teams = getBinTeams(ev.name).filter((t) => t.length >= 3).sort();
        if (teams.length >= 2) binTeamKeys.add(teams.join("|"));
      }

      // Inject ESPN "pre" (scheduled) soccer events not already in bintvjson.
      const injected: any[] = [];
      for (const ev of allEspn) {
        if (ev.status?.type?.state !== "pre") continue;
        const teams = getEspnTeams(ev).filter((t) => t.length >= 3).sort();
        if (teams.length < 2) continue;
        const key = teams.join("|");
        if (binTeamKeys.has(key)) continue; // already in bintvjson
        // Skip cricket — ESPN's cricket endpoint is currently empty so this is soccer-only.
        const leagueSlug = (ev as any)._leagueSlug as string | undefined;
        if (!leagueSlug?.startsWith("soccer/")) continue;
        const startDate =
          ev.date ||
          ev.competitions?.[0]?.startDate ||
          ev.competitions?.[0]?.date ||
          null;
        // Convert "X at Y" → "X @ Y" to match bintvjson's style.
        const name = (ev.name || ev.shortName || "")
          .replace(/\s+at\s+/i, " @ ")
          .trim();
        const leagueLabel = leagueSlugToLabel(leagueSlug);
        // Try to find a team logo from ESPN competitors
        const teamLogo =
          ev.competitions?.[0]?.competitors?.[0]?.team?.logo || "";
        injected.push({
          id: `espn-${ev.id}`,
          name: name || ev.shortName || `ESPN Event ${ev.id}`,
          poster: teamLogo || "",
          category: "Soccer",
          status: "upcoming",
          streams: [],
          startDate,
          liveState: "pre",
          matchDetail: ev.status?.type?.shortDetail || null,
          espnId: ev.id,
          espnOnly: true,
          espnLeague: leagueLabel,
        } as any);
        binTeamKeys.add(key);
      }

      return [...merged, ...injected];
    };

    const merged = {
      ...binData,
      "Live Events": mergeLive(binData["Live Events"] ?? []),
      "Upcoming Events": mergeUpcoming(binData["Upcoming Events"] ?? []),
    };

    cache = { at: now, data: merged };
    return NextResponse.json(merged, {
      headers: { "Cache-Control": "no-store", "X-Acharya-Cache": "MISS" },
    });
  } catch (err) {
    console.error("[/api/sports] failed:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sports data" },
      { status: 500 }
    );
  }
}
