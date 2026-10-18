"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Search,
  Radio,
  CalendarClock,
  Tv,
  RefreshCw,
  AlertCircle,
  Loader2,
  Trophy,
  Flame,
  Eye,
  X,
  EyeOff,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import { SportData, SportEvent, EventTab } from "@/components/sports/types";
import { EventCard } from "@/components/sports/event-card";
import { WatchDialog } from "@/components/sports/watch-dialog";
import { NepalFlag } from "@/components/sports/nepal-flag";

const BRAND = "acharyaSports";

type TabCounts = { live: number; upcoming: number; channels: number };

/** Only these sport categories are surfaced. */
const SPORT_CATEGORIES = new Set(["Soccer", "Cricket"]);

/** Keywords that strongly indicate a "live" entry is actually over / a replay. */
const ENDED_KEYWORDS =
  /\b(replay|highlights?|full match|full game|ft\b|full time|final score|ended|post[- ]?match| condensed|recap)\b/i;

const HIDDEN_KEY = "acharya:hidden-events";

function loadHiddenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(HIDDEN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveHiddenIds(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HIDDEN_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
}

export default function Home() {
  const [data, setData] = React.useState<SportData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [tab, setTab] = React.useState<EventTab>("live");
  const [query, setQuery] = React.useState("");
  const [hiddenIds, setHiddenIds] = React.useState<Set<string>>(new Set());

  const [selected, setSelected] = React.useState<SportEvent | null>(null);
  const [watchOpen, setWatchOpen] = React.useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = React.useState(false);

  // Load hidden IDs from localStorage on mount (client-only).
  React.useEffect(() => {
    setHiddenIds(loadHiddenIds());
  }, []);

  const hideEvent = React.useCallback((event: SportEvent) => {
    setHiddenIds((prev) => {
      const id = event.id || event.name;
      if (!id) return prev;
      const next = new Set(prev);
      next.add(id);
      saveHiddenIds(next);
      return next;
    });
  }, []);

  const resetHidden = React.useCallback(() => {
    setHiddenIds(new Set());
    saveHiddenIds(new Set());
  }, []);

  // Fetch sport data from our proxy route
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sports", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: SportData = await res.json();
      if (!json.success && json.error) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load live sports data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
    // Auto refresh every 90s so live statuses stay fresh.
    const t = setInterval(fetchData, 90_000);
    return () => clearInterval(t);
  }, [fetchData]);

  /**
   * Per-tab filtered events.
   * - Live tab:    ONLY events whose status === "live" (per user request).
   *                Soccer/Cricket, not hidden, not "ended-replay".
   *                Also: if ESPN says an "upcoming" event has already started
   *                (liveState === "in"), it is treated as live and shown here too.
   * - Upcoming tab: Soccer/Cricket, not hidden, AND not currently live
   *                (status upcoming AND liveState !== "in").
   *                Sorted by startDate (known times first, then unknown).
   * - 24/7 tab:    all channels (no sport filter, no status filter).
   */
  const eventsByTab = React.useMemo<SportEvent[]>(() => {
    if (!data) return [];
    const isHidden = (e: SportEvent) => hiddenIds.has(e.id || e.name || "");

    if (tab === "live") {
      const liveFromLive = (data["Live Events"] ?? []).filter(
        (e) =>
          SPORT_CATEGORIES.has(e.category) &&
          !isHidden(e) &&
          !ENDED_KEYWORDS.test(e.name || "") &&
          // ESPN says the match is NOT finished (state "post" = final)
          e.liveState !== "post"
      );
      const liveFromUpcoming = (data["Upcoming Events"] ?? []).filter(
        (e) =>
          SPORT_CATEGORIES.has(e.category) &&
          !isHidden(e) &&
          e.liveState === "in"
      );
      return [...liveFromLive, ...liveFromUpcoming];
    }
    if (tab === "upcoming") {
      const items = (data["Upcoming Events"] ?? []).filter(
        (e) =>
          SPORT_CATEGORIES.has(e.category) &&
          !isHidden(e) &&
          // ESPN says it's NOT already in progress
          e.liveState !== "in"
      );
      // Sort: known kickoffs first (ascending), then unknown-time items.
      return items.sort((a, b) => {
        const at = a.startDate ? new Date(a.startDate).getTime() : Infinity;
        const bt = b.startDate ? new Date(b.startDate).getTime() : Infinity;
        return at - bt;
      });
    }
    return data["24/7 Channels"] ?? [];
  }, [data, tab, hiddenIds]);

  /** Raw counts (post-filter, pre-search) for tab pills. */
  const counts: TabCounts = React.useMemo<TabCounts>(() => {
    if (!data) return { live: 0, upcoming: 0, channels: 0 };
    const isHidden = (e: SportEvent) => hiddenIds.has(e.id || e.name || "");
    const liveFromLive = (data["Live Events"] ?? []).filter(
      (e) =>
        SPORT_CATEGORIES.has(e.category) &&
        !isHidden(e) &&
        !ENDED_KEYWORDS.test(e.name || "") &&
        e.liveState !== "post"
    ).length;
    const liveFromUpcoming = (data["Upcoming Events"] ?? []).filter(
      (e) =>
        SPORT_CATEGORIES.has(e.category) &&
        !isHidden(e) &&
        e.liveState === "in"
    ).length;
    const live = liveFromLive + liveFromUpcoming;

    const upcoming = (data["Upcoming Events"] ?? []).filter(
      (e) =>
        SPORT_CATEGORIES.has(e.category) &&
        !isHidden(e) &&
        e.liveState !== "in"
    ).length;
    const channels = (data["24/7 Channels"] ?? []).length;
    return { live, upcoming, channels };
  }, [data, hiddenIds]);

  // Collect categories is no longer needed — we are locked to Soccer + Cricket.
  // Search now filters across name + category + stream name (still useful inside 24/7 tab).
  const filtered = React.useMemo<SportEvent[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return eventsByTab;
    return eventsByTab.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        e.streams?.some((s) => s.name?.toLowerCase().includes(q))
    );
  }, [eventsByTab, query]);

  const onWatch = React.useCallback((event: SportEvent) => {
    setSelected(event);
    setWatchOpen(true);
  }, []);

  const generatedAt = data?.generated_at
    ? new Date(data.generated_at).toLocaleString()
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold tracking-tight">
                {BRAND}
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Live sports TV
              </span>
            </div>
            {/* Nepal flag — the only non-rectangular national flag in the world */}
            <span className="ml-1 hidden items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2 py-1 sm:inline-flex">
              <NepalFlag className="h-4 w-5 drop-shadow-sm" />
              <span className="text-[11px] font-medium text-muted-foreground">Nepal</span>
            </span>
          </a>

          {/* Desktop search + actions */}
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <div className="relative w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search matches, channels…"
                className="pl-9"
              />
            </div>
            {hiddenIds.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetHidden}
                aria-label="Reset hidden matches"
                title={`${hiddenIds.size} hidden — click to restore`}
                className="gap-1.5"
              >
                <EyeOff className="h-4 w-4" />
                <span className="text-xs">Restore {hiddenIds.size}</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={fetchData}
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw
                className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              />
            </Button>
          </div>

          {/* Mobile actions */}
          <div className="ml-auto flex items-center gap-2 md:hidden">
            {hiddenIds.size > 0 && (
              <Button
                variant="outline"
                size="icon"
                onClick={resetHidden}
                aria-label="Reset hidden matches"
                title={`${hiddenIds.size} hidden — tap to restore`}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMobileSearchOpen((v) => !v)}
              aria-label="Toggle search"
            >
              {mobileSearchOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchData}
              aria-label="Refresh"
            >
              <RefreshCw
                className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
              />
            </Button>
          </div>
        </div>

        {/* Mobile search row */}
        {mobileSearchOpen && (
          <div className="border-t border-border/80 px-4 py-3 md:hidden">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search matches, channels…"
                className="pl-9"
              />
            </div>
          </div>
        )}
      </header>

      {/* ===== Hero ===== */}
      <section className="acharya-hero-gradient relative overflow-hidden border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex max-w-3xl flex-col"
          >
            <Badge className="mb-4 gap-1 bg-red-600 text-white hover:bg-red-600">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-white live-dot" />
              {loading ? "Loading live data…" : `${counts.live} live now`}
            </Badge>
            <div className="mb-4 inline-flex w-fit items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
              <NepalFlag className="h-7 w-9 drop-shadow" />
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-semibold tracking-wide text-foreground">
                  Made in Nepal 🇳🇵
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Proudly built for sports fans worldwide
                </span>
              </div>
            </div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Every match, every channel,{" "}
              <span className="bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent">
                all in one place.
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {BRAND} streams <span className="font-medium text-foreground">live soccer</span>,{" "}
              <span className="font-medium text-foreground">cricket fixtures</span> and{" "}
              <span className="font-medium text-foreground">24/7 sports channels</span> from
              around the world — free to watch, no signup required.
            </p>

            {/* Stat tiles */}
            <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-xl">
              <StatTile
                icon={<Radio className="h-4 w-4" />}
                label="Live now"
                value={counts.live}
                tone="red"
              />
              <StatTile
                icon={<CalendarClock className="h-4 w-4" />}
                label="Upcoming"
                value={counts.upcoming}
                tone="amber"
              />
              <StatTile
                icon={<Tv className="h-4 w-4" />}
                label="24/7 Channels"
                value={counts.channels}
                tone="emerald"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== Main ===== */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as EventTab)}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
            <TabsTrigger value="live" className="gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500 live-dot" />
              Live
              <CountPill n={counts.live} />
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              Upcoming
              <CountPill n={counts.upcoming} />
            </TabsTrigger>
            <TabsTrigger value="channels" className="gap-1.5">
              <Tv className="h-3.5 w-3.5" />
              24/7
              <CountPill n={counts.channels} />
            </TabsTrigger>
          </TabsList>

          {/* Shared filter bar (desktop already in header; this duplicates mobile-friendly inline controls) */}
          <div className="flex flex-wrap items-center gap-3 md:hidden">
            {/* search & category already in mobile collapsible header */}
          </div>

          {/* Category chips so users see what we surface */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              Soccer
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
              Cricket
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Tv className="h-3 w-3" /> 24/7 channels
            </span>
            {hiddenIds.size > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
                <EyeOff className="h-3 w-3" /> {hiddenIds.size} hidden
              </span>
            )}
          </div>

          {error && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center text-destructive">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm font-medium">
                Couldn&apos;t load live sports data.
              </p>
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button onClick={fetchData} variant="outline" size="sm">
                <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
              </Button>
            </div>
          )}

          {!error && (
            <>
              {loading && !data ? (
                <SkeletonGrid />
              ) : (
                <>
                  <TabsContent value={tab} className="m-0 mt-2">
                    <ResultsBar
                      total={filtered.length}
                      shown={filtered.length}
                      query={query}
                      tab={tab}
                    />
                    {filtered.length === 0 ? (
                      <EmptyState tab={tab} />
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filtered.map((e, i) => (
                          <EventCard
                            key={`${tab}-${e.id ?? i}`}
                            event={e}
                            index={i}
                            onWatch={onWatch}
                            onHide={tab === "channels" ? undefined : hideEvent}
                            isChannel={tab === "channels"}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </>
              )}
            </>
          )}
        </Tabs>
      </main>

      {/* ===== Footer ===== */}
      <footer className="mt-auto border-t border-border/60 bg-background/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Trophy className="h-4 w-4" />
            </div>
            <span>
              <span className="font-semibold text-foreground">{BRAND}</span>{" "}
              · Live sports streaming
            </span>
            <span className="mx-1 h-4 w-px bg-border/70" aria-hidden />
            <NepalFlag className="h-4 w-5 drop-shadow-sm" />
            <span className="text-xs text-muted-foreground">Made in Nepal</span>
          </div>
          <div className="text-center text-xs sm:text-right">
            <p>
              Data:{" "}
              <a
                href="https://bintvjson.lovable.app/api/public/bintvjson"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                bintvjson
              </a>
              {generatedAt && (
                <>
                  {" · "}
                  Updated {generatedAt}
                </>
              )}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              Streams are aggregated from public sources. Availability depends
              on the upstream provider.
            </p>
          </div>
        </div>
      </footer>

      {/* ===== Watch dialog ===== */}
      <WatchDialog
        event={selected}
        open={watchOpen}
        onOpenChange={setWatchOpen}
      />
    </div>
  );
}

/* =========================================================
 * Helpers
 * ========================================================= */

function CountPill({ n }: { n: number }) {
  return (
    <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
      {n}
    </span>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "red" | "amber" | "emerald";
}) {
  const toneClass = {
    red: "from-red-500/20 to-red-500/5 text-red-300 border-red-500/30",
    amber:
      "from-amber-500/20 to-amber-500/5 text-amber-300 border-amber-500/30",
    emerald:
      "from-emerald-500/20 to-emerald-500/5 text-emerald-300 border-emerald-500/30",
  }[tone];

  return (
    <div
      className={`rounded-xl border bg-gradient-to-br ${toneClass} p-3 backdrop-blur-sm`}
    >
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide opacity-80">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function ResultsBar({
  total,
  shown,
  query,
  tab,
}: {
  total: number;
  shown: number;
  query: string;
  tab: EventTab;
}) {
  const scope =
    tab === "live"
      ? "live now · soccer & cricket"
      : tab === "upcoming"
        ? "upcoming · with kickoff times"
        : "24/7 channels";
  return (
    <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
      <p className="flex items-center gap-1.5">
        <Eye className="h-3.5 w-3.5" />
        Showing <span className="font-semibold text-foreground">{shown}</span>{" "}
        {total === 1 ? "match" : "matches"} · {scope}
        {query && (
          <span className="ml-1 text-muted-foreground/70">
            · filter: <span className="text-foreground">“{query}”</span>
          </span>
        )}
      </p>
      {(total > 0 || shown > 0) && (
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground/70">
          <Flame className="h-3 w-3" /> Tap a card to start streaming
        </span>
      )}
    </div>
  );
}

function EmptyState({ tab }: { tab: EventTab }) {
  const message =
    tab === "live"
      ? "No soccer or cricket matches are live right now."
      : tab === "upcoming"
        ? "No upcoming soccer or cricket fixtures scheduled."
        : "No channels match your search.";
  const sub =
    tab === "live"
      ? "Check the Upcoming tab for what’s next."
      : tab === "upcoming"
        ? "Kickoff times appear automatically when fixtures are confirmed."
        : "Try clearing the search.";
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/40">
        <Tv className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{message}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
        >
          <div className="relative aspect-video w-full bg-muted/40">
            <Loader2 className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
          </div>
          <div className="space-y-2 p-3">
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted/60" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  );
}
