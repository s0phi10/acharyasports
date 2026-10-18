"use client";

import * as React from "react";
import Hls from "hls.js";
import { AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  poster?: string;
  className?: string;
};

/**
 * Detects whether a URL is an HLS stream (m3u8) or an embeddable web page.
 * For .m3u8 we use hls.js + <video>. For anything else we render an <iframe>.
 */
function isHls(url: string) {
  return /\.m3u8(\?|$)/i.test(url);
}

function isIframeEmbed(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const embedHosts = [
      "youtube.com",
      "youtu.be",
      "twitch.tv",
      "vimeo.com",
      "dailymotion.com",
      "player.vimeo.com",
      "players.brightcove.net",
      "ok.ru",
      "vk.com",
    ];
    return (
      embedHosts.some((h) => host === h || host.endsWith(`.${h}`)) ||
      u.pathname.includes("/embed/")
    );
  } catch {
    return false;
  }
}

export function StreamPlayer({ url, poster, className }: Props) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const hlsRef = React.useRef<Hls | null>(null);

  React.useEffect(() => {
    setLoading(true);
    setError(null);

    // Cleanup any previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (!url) {
      setError("No stream URL available.");
      setLoading(false);
      return;
    }

    // Non-HLS URLs are handled by the iframe fallback in the render below.
    if (!isHls(url)) {
      setLoading(false);
      return;
    }

    const v = videoRef.current;
    if (!v) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        v.play().catch(() => {
          /* Autoplay may be blocked — user can click play. */
        });
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setError(
                "This live stream could not be loaded. Try another source below."
              );
              setLoading(false);
              hls.destroy();
              hlsRef.current = null;
              break;
          }
        }
      });
    } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (Safari)
      v.src = url;
      v.addEventListener("loadedmetadata", () => {
        setLoading(false);
        v.play().catch(() => {});
      });
      v.addEventListener("error", () => {
        setError("This live stream could not be loaded on your browser.");
        setLoading(false);
      });
    } else {
      setError("HLS streams are not supported in this browser.");
      setLoading(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url]);

  const isHlsStream = isHls(url);
  const useIframe = !isHlsStream;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl bg-black aspect-video",
        className
      )}
    >
      {isHlsStream && (
        <>
          <video
            ref={videoRef}
            controls
            playsInline
            autoPlay
            poster={poster}
            className="absolute inset-0 h-full w-full bg-black"
          />
          {loading && !error && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
              <Loader2 className="h-7 w-7 animate-spin" />
              <p className="text-sm text-white/80">Loading live stream…</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-4 text-center text-white">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <p className="text-sm text-white/90">{error}</p>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="secondary">
                  <ExternalLink className="mr-1.5 h-4 w-4" /> Open source
                </Button>
              </a>
            </div>
          )}
        </>
      )}

      {useIframe && !error && (
        <iframe
          src={url}
          title="Live stream"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
          className="absolute inset-0 h-full w-full border-0"
        />
      )}

      {useIframe && !isIframeEmbed(url) && (
        <div className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-[10px] uppercase tracking-wide text-white/80">
          Embed
        </div>
      )}
    </div>
  );
}
