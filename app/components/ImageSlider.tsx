"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export function ImageSlider({
  urls,
  intervalMs = 20000,
  fadeMs = 500,
}: {
  urls: string[];
  intervalMs?: number;
  fadeMs?: number;
}) {
  const safe = useMemo(
    () => (Array.isArray(urls) ? urls.filter(Boolean) : []),
    [urls],
  );

  const [active, setActive] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [fadeIn, setFadeIn] = useState(false);

  const lockRef = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // reset kalau jumlah gambar berubah
    setActive(0);
    setNext(null);
    setFadeIn(false);
    lockRef.current = false;
  }, [safe.length]);

  useEffect(() => {
    if (safe.length <= 1) return;

    if (intervalRef.current) window.clearInterval(intervalRef.current);

    intervalRef.current = window.setInterval(() => {
      if (lockRef.current) return;
      lockRef.current = true;

      const nextIdx = (active + 1) % safe.length;

      // 1) render next dulu dengan opacity-0
      setNext(nextIdx);
      setFadeIn(false);

      // 2) frame berikutnya baru trigger opacity-100 (transition jalan)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFadeIn(true);
        });
      });

      // 3) setelah fade selesai, commit active
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
    <div className="relative w-full overflow-hidden rounded-2xl border border-zinc-200 bg-black">
      <div className="relative aspect-video w-full">
        {/* active */}
        <img
          src={activeUrl}
          alt={`slide-${active}`}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />

        {/* next overlay - fade in */}
        {nextUrl ? (
          <img
            src={nextUrl}
            alt={`slide-${next}`}
            className={[
              "absolute inset-0 h-full w-full object-cover",
              "transition-opacity ease-out",
              fadeIn ? "opacity-100" : "opacity-0",
            ].join(" ")}
            style={{ transitionDuration: `${fadeMs}ms` }}
            draggable={false}
            onLoad={() => {
              // opsional: kalau mau memastikan baru fade setelah load
              // (kalau kamu sering lihat “cut”, uncomment 2 baris ini)
              // setFadeIn(false);
              // requestAnimationFrame(() => setFadeIn(true));
            }}
          />
        ) : null}
      </div>

      {safe.length > 1 ? (
        <div className="absolute bottom-3 left-3 flex gap-1.5 rounded-full bg-black/35 px-2 py-1 backdrop-blur opacity-50">
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
