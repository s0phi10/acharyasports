"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  CalendarClock,
  MonitorPlay,
  Play,
  EyeOff,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SportEvent } from "./types";
import {
  formatKickoff,
  formatRelativeKickoff,
  formatKickoffDay,
} from "./date-utils";

type Props = {
  event: SportEvent;
  index?: number;
  onWatch: (event: SportEvent) => void;
  onHide?: (event: SportEvent) => void;
  /** When true, this card is a 24/7 channel (we don't show the hide button on these). */
  isChannel?: boolean;
};

function StatusBadge({ event }: { event: SportEvent }) {
  if (event.status === "live") {
    return (
      <Badge className="bg-red-600 hover:bg-red-600 text-white">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-white live-dot" />
        LIVE
      </Badge>
    );
  }
  if (event.status === "upcoming") {
    return (
      <Badge className="bg-amber-500 hover:bg-amber-500 text-black">
        <CalendarClock className="mr-1 h-3.5 w-3.5" /> Upcoming
      </Badge>
    );
  }
  return (
    <Badge className="bg-primary text-primary-foreground hover:bg-primary">
      <MonitorPlay className="mr-1 h-3.5 w-3.5" /> 24/7
    </Badge>
  );
}

export function EventCard({ event, index = 0, onWatch, onHide, isChannel }: Props) {
  const [imgError, setImgError] = React.useState(false);

  const kickoff = formatKickoff(event.startDate);
  const kickoffRelative = formatRelativeKickoff(event.startDate);
  const kickoffDay = formatKickoffDay(event.startDate);
  // ESPN live match detail, e.g. "13'" or "2nd Half"
  const liveDetail = event.status === "live" ? event.matchDetail : null;
  // ESPN can also tell us an "upcoming" event has actually started → treat as live
  const espnStarted = event.liveState === "in";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.3) }}
      whileHover={{ y: -4 }}
      className="acharya-card-glow group relative flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-xl"
    >
      {/* Main clickable area — opens player */}
      <button
        type="button"
        onClick={() => onWatch(event)}
        className="relative flex flex-1 flex-col overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Watch ${event.name}`}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-muted/40">
          {!imgError && event.poster ? (
            <img
              src={event.poster}
              alt={event.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/60 to-muted/20 text-muted-foreground">
              <MonitorPlay className="h-10 w-10 opacity-50" />
            </div>
          )}

          {/* gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />

          {/* top-left status badge */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5">
            <StatusBadge event={event} />
            {/* ESPN detected this match is actually in progress — extra clock badge */}
            {espnStarted && event.status !== "live" && (
              <Badge className="bg-red-600 hover:bg-red-600 text-white">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-white live-dot" />
                LIVE
              </Badge>
            )}
            {/* ESPN live match detail (clock display) */}
            {liveDetail && (
              <span className="inline-flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                <Clock className="h-3 w-3" />
                {liveDetail}
              </span>
            )}
          </div>

          {/* play overlay on hover */}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity",
              "opacity-0 group-hover:opacity-100"
            )}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
              <Play className="h-6 w-6 translate-x-0.5 fill-current" />
            </div>
          </div>

          {/* category chip bottom-left */}
          {event.category && !event.espnLeague && (
            <div className="absolute bottom-3 left-3">
              <span className="rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-white/90 backdrop-blur-sm">
                {event.category}
              </span>
            </div>
          )}
          {event.espnLeague && (
            <div className="absolute bottom-3 left-3">
              <span className="rounded-md bg-primary/85 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground backdrop-blur-sm">
                {event.espnLeague}
              </span>
            </div>
          )}

          {/* "Streaming when live" badge for espn-only fixtures (no stream URLs yet) */}
          {event.espnOnly && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-blue-600/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
              <Clock className="h-3 w-3" /> Streaming when live
            </div>
          )}

          {/* "no sources" warning bottom-right (only if NOT espnOnly) */}
          {(!event.streams || event.streams.length === 0) && !event.espnOnly && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-amber-600/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
              <AlertTriangle className="h-3 w-3" /> No stream
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {event.name}
          </h3>

          {/* Kickoff date/time row (upcoming events) */}
          {event.status === "upcoming" && kickoff && (
            <div className="mt-1 flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300">
              <CalendarClock className="h-3 w-3 shrink-0" />
              <span className="font-medium">{kickoffDay}</span>
              <span className="text-amber-300/60">·</span>
              <span className="text-amber-200/90">{kickoff}</span>
              {kickoffRelative && (
                <>
                  <span className="text-amber-300/40">·</span>
                  <span className="text-amber-300/80 italic">{kickoffRelative}</span>
                </>
              )}
            </div>
          )}
          {event.status === "upcoming" && !kickoff && (
            <div className="mt-1 flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              <span className="italic">Time not announced yet</span>
            </div>
          )}

          <p className="mt-auto text-[11px] text-muted-foreground">
            {event.streams?.length > 0
              ? `${event.streams.length} source${
                  event.streams.length === 1 ? "" : "s"
                }`
              : "No sources"}
          </p>
        </div>
      </button>

      {/* Hide button — only on live + upcoming (NOT on 24/7 channels) */}
      {!isChannel && onHide && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHide(event);
          }}
          aria-label={`Hide ${event.name} (mark as ended)`}
          title="Hide — mark as ended"
          className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white/90 opacity-0 backdrop-blur-sm transition-opacity hover:bg-red-600 hover:text-white focus:opacity-100 group-hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      )}
    </motion.div>
  );
}
