"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageSlider } from "./ImageSlider";

export type PopupPost = {
  id: string;
  media_type?: "popup_images" | "popup_video" | null;
  media_urls?: string[] | null;
  fields?: Record<string, string>;
  updated_at: string;
};

function num(
  fields: Record<string, string> | undefined,
  key: string,
  fallback: number,
) {
  const v = Number(fields?.[key]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export function PopupOverlay({ post }: { post: PopupPost | null }) {
  const enabled = post?.fields?.["popup_enabled"] === "true";
  const triggerTs = post?.fields?.["popup_trigger_ts"] || "";
  const cycleEnabled = post?.fields?.["popup_cycle_enabled"] === "true";
  const showMs = num(post?.fields, "popup_cycle_show_ms", 10000);
  const hideMs = num(post?.fields, "popup_cycle_hide_ms", 30000);
  const sliderIntervalMs = num(post?.fields, "popup_slider_interval_ms", 4000);

  const mediaUrls = useMemo(
    () =>
      Array.isArray(post?.media_urls) ? post!.media_urls!.filter(Boolean) : [],
    [post],
  );

  const storageKey = post
    ? `popup_seen_trigger_${post.id}`
    : "popup_seen_trigger_none";

  const [open, setOpen] = useState(false);
  const timers = useRef<{ show?: any; hide?: any }>({});

  // Force show again when trigger changes
  useEffect(() => {
    if (!post || !enabled) {
      setOpen(false);
      return;
    }

    const seen = sessionStorage.getItem(storageKey) || "";

    if (triggerTs && seen !== triggerTs) {
      setOpen(true);
      sessionStorage.setItem(storageKey, triggerTs);
      return;
    }

    // OPTIONAL: kalau kamu mau "enabled=true" langsung tampil walau tanpa trigger:
    // if (!triggerTs) setOpen(true);
  }, [post?.id, enabled, triggerTs, storageKey]);

  // Cycle mode
  useEffect(() => {
    if (timers.current.show) clearTimeout(timers.current.show);
    if (timers.current.hide) clearTimeout(timers.current.hide);

    if (!post || !enabled || !cycleEnabled) return;

    const run = () => {
      setOpen(true);
      timers.current.hide = setTimeout(() => {
        setOpen(false);
        timers.current.show = setTimeout(run, hideMs);
      }, showMs);
    };

    run();

    return () => {
      if (timers.current.show) clearTimeout(timers.current.show);
      if (timers.current.hide) clearTimeout(timers.current.hide);
    };
  }, [post?.id, enabled, cycleEnabled, showMs, hideMs, triggerTs]);

  if (!post || !enabled || !open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      <button
        onClick={() => setOpen(false)}
        className="absolute right-4 top-4 z-10 rounded-xl bg-zinc-900 px-2 py-1 text-sm text-white font-medium hover:bg-zinc-400 opacity-50"
      >
        Close
      </button>

      <div className="h-full w-full">
        {post.media_type === "popup_images" && mediaUrls.length > 0 ? (
          <ImageSlider urls={mediaUrls} intervalMs={sliderIntervalMs} />
        ) : post.media_type === "popup_video" && mediaUrls.length > 0 ? (
          <video
            src={mediaUrls[0]}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-contain"
          />
        ) : null}
      </div>
    </div>
  );
}
