"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export function VideoSlider({
  urls,
  intervalMs = 15000,
  fadeMs = 600,
  muted = true,
}: {
  urls: string[];
  intervalMs?: number;
  fadeMs?: number;
  muted?: boolean;
}) {
  const safe = useMemo(
    () => (Array.isArray(urls) ? urls.filter(Boolean).map(String) : []),
    [urls],
  );

  const [active, setActive] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [fadeIn, setFadeIn] = useState(false);

  const lockRef = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const activeRef = useRef<HTMLVideoElement | null>(null);
  const nextRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setActive(0);
    setNext(null);
    setFadeIn(false);
    lockRef.current = false;
  }, [safe.length]);

  async function safePlay(el: HTMLVideoElement | null) {
    if (!el) return;
    try {
      el.currentTime = 0;
      const p = el.play();
      if (p && typeof (p as any).catch === "function") {
        await (p as any).catch(() => {});
      }
    } catch {
      // ignore autoplay failures
    }
  }

  useEffect(() => {
    if (!safe.length) return;
    safePlay(activeRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, safe.length]);

  useEffect(() => {
    if (safe.length <= 1) return;

    if (intervalRef.current) window.clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      if (lockRef.current) return;
      lockRef.current = true;

      const nextIdx = (active + 1) % safe.length;

      setNext(nextIdx);
      setFadeIn(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFadeIn(true);
          safePlay(nextRef.current);
        });
      });

      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setActive(nextIdx);
        setNext(null);
        setFadeIn(false);
        lockRef.current = false;
      }, fadeMs);
    }, intervalMs);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [safe.length, active, intervalMs, fadeMs]);

  if (!safe.length) return null;

  const activeUrl = safe[active];
  const nextUrl = next !== null ? safe[next] : null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/15 bg-black">
      <div className="relative aspect-video w-full">
        <video
          ref={activeRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={activeUrl}
          autoPlay
          muted={muted}
          playsInline
          controls={false}
          preload="metadata"
        />

        {nextUrl ? (
          <video
            ref={nextRef}
            className={[
              "absolute inset-0 h-full w-full object-cover",
              "transition-opacity ease-out",
              fadeIn ? "opacity-100" : "opacity-0",
            ].join(" ")}
            style={{ transitionDuration: `${fadeMs}ms` }}
            src={nextUrl}
            autoPlay
            muted={muted}
            playsInline
            controls={false}
            preload="metadata"
          />
        ) : null}
      </div>

      {safe.length > 1 ? (
        <div className="absolute bottom-3 left-3 flex gap-1.5 rounded-full bg-black/35 px-2 py-1 backdrop-blur opacity-60">
          {safe.map((_, i) => {
            const on = i === (next ?? active);
            return (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${on ? "bg-white" : "bg-white/40"}`}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
