"use client";

import { useEffect, useState } from "react";
import {
  fetchSettings,
  updateSettings,
  type CmsSettings,
  normalizeSettingsFromSocket,
  uploadLandingBackground,
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

  // NEW: landing background
  const [landingBackgroundUrl, setLandingBackgroundUrl] = useState<string>("");
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [uploadingBackground, setUploadingBackground] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const s = await fetchSettings(apiBase);
      setTickerText(s.ticker_text || "");
      setSlideDurationMs(Number(s.slide_duration_ms || 8000));
      setMediaIntervalMs(Number(s.media_interval_ms || 15000));
      setLandingBackgroundUrl(String(s.landing_background_url || ""));
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
        landing_background_url: landingBackgroundUrl.trim(),
      };

      await updateSettings(apiBase, payload);
      pushStatus("Saved.");
    } catch (e: any) {
      pushError(e?.message || "Save failed");
    }
  }

  async function handleUploadBackground() {
    if (disabled || loading) return;
    if (!backgroundFile) {
      pushError("Please choose an image file first.");
      return;
    }

    // Validasi ringan di client
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(backgroundFile.type)) {
      pushError("Only JPG, PNG, or WEBP images are allowed.");
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (backgroundFile.size > maxSize) {
      pushError("Image is too large. Max size is 10MB.");
      return;
    }

    try {
      setUploadingBackground(true);
      pushStatus("Uploading background image...");

      const result = await uploadLandingBackground(apiBase, backgroundFile);

      if (!result?.url) {
        throw new Error("Upload succeeded but URL was not returned");
      }

      setLandingBackgroundUrl(result.url);
      setBackgroundFile(null);

      pushStatus("Background uploaded. Click Save to apply.");
    } catch (e: any) {
      pushError(e?.message || "Failed to upload background");
    } finally {
      setUploadingBackground(false);
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
      setLandingBackgroundUrl(String(s.landing_background_url || ""));
      pushStatus("Settings updated (realtime).");
    };

    socket.on("settings:update", onSettingsUpdate);
    return () => {
      socket.off("settings:update", onSettingsUpdate);
    };
  }, [socket, pushStatus]);

  const previewBackgroundUrl =
    landingBackgroundUrl?.trim() || "/background-4.jpg";

  return (
    <div className="grid gap-4">
      {/* LANDING BACKGROUND */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="text-sm font-semibold text-zinc-900">
          Landing Background
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          Background utama untuk halaman landing. Bisa upload gambar atau isi
          URL manual.
        </div>

        <div
          className="mt-3 h-40 w-full rounded-xl border border-zinc-200 bg-zinc-100"
          style={{
            backgroundImage: `url("${previewBackgroundUrl.replace(/"/g, '\\"')}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />

        <div className="mt-3 grid gap-2">
          <label className="text-sm font-medium text-zinc-800">
            Background URL
          </label>
          <input
            type="text"
            value={landingBackgroundUrl}
            disabled={disabled || loading || uploadingBackground}
            onChange={(e) => setLandingBackgroundUrl(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
            placeholder="https://... atau /background-4.jpg"
          />
          <div className="text-xs text-zinc-500">
            Kosongkan untuk memakai fallback background lokal.
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-800">
              Upload image (JPG/PNG/WEBP)
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              disabled={disabled || loading || uploadingBackground}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setBackgroundFile(file);
              }}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium disabled:opacity-60"
            />
          </div>

          <button
            type="button"
            onClick={handleUploadBackground}
            disabled={disabled || loading || uploadingBackground}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
          >
            {uploadingBackground ? "Uploading..." : "Upload"}
          </button>

          <button
            type="button"
            onClick={() => setLandingBackgroundUrl("")}
            disabled={disabled || loading || uploadingBackground}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
          >
            Reset URL
          </button>

          <button
            type="button"
            onClick={save}
            disabled={disabled || loading || uploadingBackground}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </div>

      {/* RUNNING TEXT */}
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
