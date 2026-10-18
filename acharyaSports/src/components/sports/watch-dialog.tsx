"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ExternalLink, Radio, CalendarClock, MonitorPlay, Clock } from "lucide-react";
import { SportEvent } from "./types";
import { StreamPlayer } from "./stream-player";
import { formatKickoff, formatRelativeKickoff } from "./date-utils";

type Props = {
  event: SportEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function StatusBadge({ status }: { status: SportEvent["status"] }) {
  if (status === "live") {
    return (
      <Badge className="bg-red-600 hover:bg-red-600 text-white">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-white live-dot" />
        LIVE
      </Badge>
    );
  }
  if (status === "upcoming") {
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

export function WatchDialog({ event, open, onOpenChange }: Props) {
  const [streamIdx, setStreamIdx] = React.useState(0);

  React.useEffect(() => {
    if (open) setStreamIdx(0);
  }, [open, event?.id]);

  if (!event) return null;

  const stream = event.streams?.[streamIdx];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <div className="relative">
          {stream ? (
            <StreamPlayer url={stream.url} poster={event.poster} />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-black text-white/70">
              No stream sources available for this event.
            </div>
          )}
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          <DialogHeader className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={event.status} />
              {event.liveState === "in" && event.status !== "live" && (
                <Badge className="bg-red-600 hover:bg-red-600 text-white">
                  <span className="mr-1 inline-block h-2 w-2 rounded-full bg-white live-dot" />
                  LIVE NOW
                </Badge>
              )}
              {event.matchDetail && event.status === "live" && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {event.matchDetail}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {event.category}
              </Badge>
            </div>
            <DialogTitle className="text-xl leading-tight sm:text-2xl">
              {event.name}
            </DialogTitle>
            {event.status === "upcoming" && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {event.startDate ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-amber-300">
                    <CalendarClock className="h-3.5 w-3.5" />
                    <span className="font-medium">{formatKickoff(event.startDate)}</span>
                    <span className="text-amber-300/70 italic">· {formatRelativeKickoff(event.startDate)}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/40 px-2 py-1 text-muted-foreground italic">
                    <Clock className="h-3.5 w-3.5" />
                    Kickoff time not announced yet
                  </span>
                )}
              </div>
            )}
            <DialogDescription className="text-sm text-muted-foreground">
              {event.streams?.length > 0
                ? `${event.streams.length} source${
                    event.streams.length === 1 ? "" : "s"
                  } available. Pick one below.`
                : "No sources available right now."}
            </DialogDescription>
          </DialogHeader>

          {event.streams?.length > 1 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Radio className="h-3.5 w-3.5" /> Stream sources
              </p>
              <RadioGroup
                value={String(streamIdx)}
                onValueChange={(v) => setStreamIdx(Number(v))}
                className="flex flex-wrap gap-2"
              >
                {event.streams.map((s, i) => (
                  <div key={i} className="flex items-center">
                    <RadioGroupItem
                      value={String(i)}
                      id={`src-${i}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`src-${i}`}
                      className="cursor-pointer rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/15 peer-data-[state=checked]:text-primary"
                    >
                      {s.name || `Source ${i + 1}`}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {stream && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">
                Current source:{" "}
                <span className="font-medium text-foreground">
                  {stream.name || "Default"}
                </span>
              </span>
              <a
                href={stream.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto"
              >
                <Button size="sm" variant="outline">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open in new tab
                </Button>
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
