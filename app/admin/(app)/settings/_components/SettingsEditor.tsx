"use client";

import { useEffect, useState } from "react";
import {
  fetchSettings,
  updateSettings,
  type CmsSettings,
  normalizeSettingsFromSocket,
} from "../../../../lib/settingsApi";

import { useSocket } from "../../posts/_lib/socket";

export function SettingsEditor({
  apiBase,
  disabled,
  pushStatus,
  pushError,
}: {
  apiBase: string;
  disabled?: boolean;
  pushStatus: (msg: string) => void;
  pushError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);

  const [tickerText, setTickerText] = useState(
    "Selamat datang. Mohon matikan/heningkan ponsel. Jaga kebersihan dan ketertiban.",
  );

  // untuk perpindahan tipe slide (post/schedule/media/donation)
  const [slideDurationMs, setSlideDurationMs] = useState<number>(8000);

  // khusus interval media slider (image/video)
  const [mediaIntervalMs, setMediaIntervalMs] = useState<number>(15000);

  async function load() {
    setLoading(true);
    try {
      const s = await fetchSettings(apiBase);
      setTickerText(s.ticker_text || "");
      setSlideDurationMs(Number(s.slide_duration_ms || 8000));
      setMediaIntervalMs(Number(s.media_interval_ms || 15000));
      pushStatus("Settings loaded.");
    } catch (e: any) {
      pushError(e?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (disabled) return;
    try {
      pushStatus("Saving settings...");

      const payload: CmsSettings = {
        ticker_text: tickerText,
        slide_duration_ms: Math.max(
          500,
          Number.isFinite(slideDurationMs) ? slideDurationMs : 8000,
        ),
        media_interval_ms: Math.max(
          500,
          Number.isFinite(mediaIntervalMs) ? mediaIntervalMs : 15000,
        ),
      };

      await updateSettings(apiBase, payload);
      pushStatus("Saved.");
    } catch (e: any) {
      pushError(e?.message || "Save failed");
    }
  }

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  const socket = useSocket(socketUrl);

  // realtime: kalau admin A save, admin B langsung ke-update tanpa reload
  useEffect(() => {
    if (!socket) return;

    const onSettingsUpdate = (rowOrFlat: any) => {
      const s = normalizeSettingsFromSocket(rowOrFlat);
      setTickerText(s.ticker_text || "");
      setSlideDurationMs(Number(s.slide_duration_ms || 8000));
      setMediaIntervalMs(Number(s.media_interval_ms || 15000));
      pushStatus("Settings updated (realtime).");
    };

    socket.on("settings:update", onSettingsUpdate);
    return () => {
      socket.off("settings:update", onSettingsUpdate);
    };
  }, [socket, pushStatus]);

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="text-sm font-semibold text-zinc-900">
          Landing Running Text
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          Akan tampil sebagai running text di bagian bawah landing page.
        </div>

        <textarea
          value={tickerText}
          disabled={disabled || loading}
          onChange={(e) => setTickerText(e.target.value)}
          className="mt-3 min-h-[120px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 disabled:opacity-60"
          placeholder="Masukkan teks running..."
        />
      </div>

      {/* SLIDE DURATION */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="text-sm font-semibold text-zinc-900">
          Slide Duration (ms)
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          Durasi perpindahan antar tipe konten (Post / Schedule / Media /
          Donation).
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-800">
              Duration (milliseconds)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={500}
              step={100}
              value={slideDurationMs}
              disabled={disabled || loading}
              onChange={(e) => setSlideDurationMs(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
              placeholder="mis. 8000"
            />
          </div>

          <div className="flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={load}
              disabled={disabled || loading}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            >
              Reload
            </button>

            <button
              type="button"
              onClick={save}
              disabled={disabled || loading}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </div>

        <div className="mt-2 text-xs text-zinc-500">
          Minimal 500ms biar tidak terlalu cepat.
        </div>
      </div>

      {/* MEDIA INTERVAL */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="text-sm font-semibold text-zinc-900">
          Media Interval (ms)
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          Durasi pergantian item di media slider (images/video) saat slide tipe
          Media tampil.
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-800">
              Interval (milliseconds)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={500}
              step={100}
              value={mediaIntervalMs}
              disabled={disabled || loading}
              onChange={(e) => setMediaIntervalMs(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
              placeholder="mis. 15000"
            />
          </div>

          <div className="flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={load}
              disabled={disabled || loading}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            >
              Reload
            </button>

            <button
              type="button"
              onClick={save}
              disabled={disabled || loading}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </div>

        <div className="mt-2 text-xs text-zinc-500">
          Minimal 500ms biar tidak terlalu cepat.
        </div>
      </div>
    </div>
  );
}
