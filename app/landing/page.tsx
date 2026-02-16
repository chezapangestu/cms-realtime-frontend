"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";
import { useSocket } from "../admin/(app)/posts/_lib/socket";
import { fetchPosts, type PostItem } from "../admin/(app)/posts/_lib/postsApi";
import { cleanStr } from "../admin/(app)/posts/_lib/helpers";
import { ImageSlider } from "../components/ImageSlider";
import { VideoSlider } from "../components/VideoSlider";
import Image from "next/image";
import icon from "../../public/favicon.png";

type PrayerTimes = {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Imsak?: string;
  Midnight?: string;
  Firstthird?: string;
  Lastthird?: string;
  Date: string;
  HijriDay: string;
  HijriMonth: string;
  HijriYear: string;
  Source: string;
};

type PrayerKey = "Fajr" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
const PRAYER_ORDER: PrayerKey[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

type SlideType = "post" | "schedule" | "media" | "donation";
type SlideItem = { key: string; post: PostItem; type: SlideType };

function stripHtml(html: string) {
  return (html || "").replace(/<[^>]+>/g, "").trim();
}

function parseHHMMToMinutes(hhmm: string) {
  const m = hhmm.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

function getCurrentPrayerKey(
  nowMinutes: number,
  times: PrayerTimes | null,
): PrayerKey | null {
  if (!times) return null;

  const mapped = PRAYER_ORDER.map((k) => ({
    k,
    t: parseHHMMToMinutes(times[k]),
  })).filter((x) => x.t !== null) as { k: PrayerKey; t: number }[];

  if (mapped.length === 0) return null;

  let current: PrayerKey | null = null;
  for (const item of mapped) {
    if (item.t <= nowMinutes) current = item.k;
  }

  if (!current) current = "Isha";
  return current;
}

function LogoCenter() {
  return (
    <div className="flex items-center justify-center">
      {" "}
      <div className="h-10 w-10 rounded-2xl bg-white/15 border border-white/20">
        {" "}
        <Image
          src={icon}
          width={50}
          height={50}
          alt="Picture of the author"
        />{" "}
      </div>{" "}
      <div className="ml-3">
        {" "}
        <div className="text-base font-semibold leading-tight">
          {" "}
          Masjid Al Ukhuwah{" "}
        </div>{" "}
        <div className="text-xs text-white/80">
          {" "}
          Pesona Bali City VIew Residence{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}

function TopBar({
  dayDateText,
  hijriText,
  timeText,
}: {
  dayDateText: string;
  hijriText: string;
  timeText: string;
}) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur p-4">
      <div className="grid grid-cols-3 items-center gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{dayDateText}</div>
          <div className="mt-0.5 text-xs text-white/80">{hijriText}</div>
        </div>

        <LogoCenter />

        <div className="flex justify-end">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2">
            <div className="text-xl font-semibold tabular-nums">{timeText}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrayerCard({
  label,
  time,
  active,
}: {
  label: string;
  time: string;
  active: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4 transition",
        active
          ? "border-white/60 bg-white text-[#1D3E53]"
          : "border-white/15 bg-white/10 text-white",
      ].join(" ")}
    >
      <div
        className={[
          "text-xs font-medium",
          active ? "opacity-80" : "text-white/80",
        ].join(" ")}
      >
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{time}</div>
    </div>
  );
}

function RunningText({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 overflow-hidden">
      <div className="whitespace-nowrap py-3">
        <div className="animate-marquee inline-block px-6 text-sm font-medium text-white/95">
          {text}
        </div>
        <div className="animate-marquee inline-block px-6 text-sm font-medium text-white/95">
          {text}
        </div>
      </div>
    </div>
  );
}

// ====== SETTINGS normalize (backend bisa kirim row {id, fields} atau flat object) ======
function normalizeSettings(input: any) {
  const fields =
    input?.fields && typeof input.fields === "object" ? input.fields : input;

  return {
    ticker_text:
      typeof fields?.ticker_text === "string" ? fields.ticker_text : "",
    slide_duration_ms: Math.max(500, Number(fields?.slide_duration_ms || 8000)),
    media_interval_ms: Math.max(
      500,
      Number(fields?.media_interval_ms || 15000),
    ),
  };
}

async function fetchSettingsFromApi(apiBase: string) {
  const res = await fetch(`${apiBase}/settings?id=app`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load settings");
  const json = await res.json();
  return normalizeSettings(json);
}

// ====== CONTENT TYPE DETECTOR ======
function getPostSlideTypes(p: PostItem): SlideType[] {
  const f = (p.fields || {}) as Record<string, any>;
  const types: SlideType[] = [];

  // Post/Text
  const hasText = Object.keys(f).some((k) => {
    const v = cleanStr(f[k]);
    return (
      (k.startsWith("title_") || k.startsWith("description_")) && v.length > 0
    );
  });
  if (hasText) types.push("post");

  // Schedule
  const hasSchedule =
    typeof f.schedule_json === "string" && cleanStr(f.schedule_json).length > 2;
  if (hasSchedule) types.push("schedule");

  // Media
  const mediaCount = Array.isArray(p.media_urls)
    ? p.media_urls.filter(Boolean).length
    : 0;
  const mt = String((p as any).media_type || "");
  const hasMediaType = [
    "images",
    "video",
    "popup_images",
    "popup_video",
  ].includes(mt);
  if (hasMediaType && mediaCount > 0) types.push("media");

  // Donation
  const hasDonation =
    cleanStr(f.infak_title).length > 0 ||
    Number(f.infak_amount || 0) > 0 ||
    cleanStr(f.wakaf_title).length > 0 ||
    Number(f.wakaf_amount || 0) > 0 ||
    cleanStr(f.zakat_title).length > 0 ||
    Number(f.zakat_amount || 0) > 0 ||
    (f.infak_target_enabled === "true" &&
      Number(f.infak_target_amount || 0) > 0) ||
    (f.wakaf_target_enabled === "true" &&
      Number(f.wakaf_target_amount || 0) > 0) ||
    (f.zakat_target_enabled === "true" &&
      Number(f.zakat_target_amount || 0) > 0);

  if (hasDonation) types.push("donation");

  return types;
}

function slideLabel(type: SlideType) {
  if (type === "post") return "Post";
  if (type === "schedule") return "Schedule";
  if (type === "media") return "Media";
  return "Donation";
}

function SlideRenderer({
  post,
  type,
  mediaIntervalMs,
}: {
  post: PostItem;
  type: SlideType;
  mediaIntervalMs: number;
}) {
  const f = (post.fields || {}) as Record<string, any>;

  if (type === "post") {
    const title = cleanStr(f.title_1) || "Untitled";
    const desc = stripHtml(cleanStr(f.description_1) || "");
    return (
      <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
        <div className="text-base font-semibold">{title}</div>
        {desc ? (
          <div className="mt-1 text-sm text-white/85 line-clamp-6">{desc}</div>
        ) : null}
      </div>
    );
  }

  if (type === "schedule") {
    const title = cleanStr(f.schedule_title) || "Schedule";
    const caption = cleanStr(f.schedule_caption) || "";
    const raw = cleanStr(f.schedule_json) || "[]";

    let count = 0;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) count = parsed.length;
    } catch {
      count = 0;
    }

    return (
      <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="text-base font-semibold">{title}</div>
          <div className="text-xs text-white/70">
            {count ? `×${count}` : ""}
          </div>
        </div>
        {caption ? (
          <div className="mt-1 text-sm text-white/85 line-clamp-3">
            {stripHtml(caption)}
          </div>
        ) : null}
        <div className="mt-3 text-xs text-white/70">
          (Preview schedule bisa kamu render lebih detail nanti)
        </div>
      </div>
    );
  }

  if (type === "media") {
    const mt = String((post as any).media_type || "-");
    const urls = Array.isArray(post.media_urls)
      ? post.media_urls.filter(Boolean).map(String)
      : [];

    const isImages = mt === "images" || mt === "popup_images";
    const isVideo = mt === "video" || mt === "popup_video";

    return (
      <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-base font-semibold">Media</div>
          <div className="text-xs text-white/70">
            <span className="font-mono">{mt}</span> • {urls.length} item
          </div>
        </div>

        <div className="mt-3">
          {isImages ? (
            <ImageSlider
              urls={urls}
              intervalMs={Math.max(500, Number(mediaIntervalMs || 15000))}
              fadeMs={600}
            />
          ) : null}

          {isVideo ? (
            <VideoSlider
              urls={urls}
              intervalMs={Math.max(500, Number(mediaIntervalMs || 15000))}
              fadeMs={600}
              muted
            />
          ) : null}

          {!isImages && !isVideo ? (
            <div className="text-sm text-white/80">
              Media type tidak dikenali.
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // donation
  const infakTitle = cleanStr(f.infak_title);
  const wakafTitle = cleanStr(f.wakaf_title);
  const zakatTitle = cleanStr(f.zakat_title);

  const infak = Number(f.infak_amount || 0);
  const wakaf = Number(f.wakaf_amount || 0);
  const zakat = Number(f.zakat_amount || 0);

  const items: { label: string; title?: string; amount?: number }[] = [];
  if (infakTitle || infak > 0)
    items.push({ label: "Infak", title: infakTitle, amount: infak });
  if (wakafTitle || wakaf > 0)
    items.push({ label: "Wakaf", title: wakafTitle, amount: wakaf });
  if (zakatTitle || zakat > 0)
    items.push({ label: "Zakat", title: zakatTitle, amount: zakat });

  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
      <div className="text-base font-semibold">Donation</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {items.length ? (
          items.map((x) => (
            <div
              key={x.label}
              className="rounded-2xl border border-white/15 bg-white/10 p-3"
            >
              <div className="text-xs text-white/80">{x.label}</div>
              <div className="mt-1 text-sm font-semibold line-clamp-2">
                {x.title || "-"}
              </div>
              <div className="mt-1 text-xs text-white/70">
                {x.amount ? `Rp ${x.amount.toLocaleString("id-ID")}` : ""}
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-white/80">Tidak ada data donation.</div>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE!;
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  const socket = useSocket(socketUrl);

  const [now, setNow] = useState(() => DateTime.now().setZone("Asia/Jakarta"));
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [prayer, setPrayer] = useState<PrayerTimes | null>(null);

  // settings
  const [tickerText, setTickerText] = useState(
    "Selamat datang. Mohon matikan/heningkan ponsel. Jaga kebersihan dan ketertiban.",
  );
  const [slideDurationMs, setSlideDurationMs] = useState<number>(8000);
  const [mediaIntervalMs, setMediaIntervalMs] = useState<number>(15000);

  // slider (tipe slide)
  const [slideIdx, setSlideIdx] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => {
      setNow(DateTime.now().setZone("Asia/Jakarta"));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  async function loadPosts() {
    const data = await fetchPosts(apiBase);
    setPosts(Array.isArray(data) ? data : []);
  }

  async function loadPrayerTimes() {
    const res = await fetch("/api/prayer-times", { cache: "no-store" });
    const json = (await res.json()) as PrayerTimes;
    setPrayer(json);
  }

  async function loadSettings() {
    try {
      const s = await fetchSettingsFromApi(apiBase);
      setTickerText(s.ticker_text || "");

      const sd = Number(s.slide_duration_ms || 8000);
      setSlideDurationMs(!Number.isNaN(sd) ? Math.max(500, sd) : 8000);

      const mi = Number(s.media_interval_ms || 15000);
      setMediaIntervalMs(!Number.isNaN(mi) ? Math.max(500, mi) : 15000);
    } catch {
      // ignore
    }
  }

  // initial load
  useEffect(() => {
    loadPosts();
    loadPrayerTimes();
    loadSettings();

    const t = setInterval(loadPrayerTimes, 30 * 60 * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // realtime posts + settings
  useEffect(() => {
    if (!socket) return;

    const onUpsert = (post: PostItem) => {
      setPosts((prev) => {
        const idx = prev.findIndex((p) => p.id === post.id);
        if (idx === -1) return [post, ...prev];
        const copy = [...prev];
        copy[idx] = post;
        return copy;
      });
    };

    const onDelete = ({ id }: { id: string }) => {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    };

    const onSettingsUpdate = (row: any) => {
      const s = normalizeSettings(row);
      setTickerText(String(s.ticker_text || ""));

      const sd = Number(s.slide_duration_ms || 8000);
      if (!Number.isNaN(sd)) setSlideDurationMs(Math.max(500, sd));

      const mi = Number(s.media_interval_ms || 15000);
      if (!Number.isNaN(mi)) setMediaIntervalMs(Math.max(500, mi));
    };

    socket.on("post:upsert", onUpsert);
    socket.on("post:delete", onDelete);
    socket.on("settings:update", onSettingsUpdate);

    return () => {
      socket.off("post:upsert", onUpsert);
      socket.off("post:delete", onDelete);
      socket.off("settings:update", onSettingsUpdate);
    };
  }, [socket]);

  const dayDateText = useMemo(
    () => now.setLocale("id").toFormat("cccc, dd LLLL yyyy"),
    [now],
  );
  const timeText = useMemo(() => now.toFormat("HH:mm"), [now]);

  const hijriText = useMemo(() => {
    if (!prayer) return "Tanggal Hijriah: -";
    return `Hijriah: ${prayer.HijriDay} ${prayer.HijriMonth} ${prayer.HijriYear}`;
  }, [prayer]);

  const nowMinutes = useMemo(() => now.hour * 60 + now.minute, [now]);
  const currentPrayer = useMemo(
    () => getCurrentPrayerKey(nowMinutes, prayer),
    [nowMinutes, prayer],
  );

  const sortedPosts = useMemo(() => {
    const copy = [...posts];
    copy.sort((a, b) => {
      const oa = Number(a.fields?.display_order ?? Number.MAX_SAFE_INTEGER);
      const ob = Number(b.fields?.display_order ?? Number.MAX_SAFE_INTEGER);
      if (oa !== ob) return oa - ob;
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });
    return copy;
  }, [posts]);

  // Build slides: urutan mengikuti LIST posts
  const slides = useMemo<SlideItem[]>(() => {
    const acc: SlideItem[] = [];
    for (const p of sortedPosts) {
      const types = getPostSlideTypes(p);
      for (const t of types) {
        acc.push({ key: `${p.id}:${t}`, post: p, type: t });
      }
    }
    return acc;
  }, [sortedPosts]);

  // Reset index kalau out-of-range saat slides berubah
  useEffect(() => {
    if (slideIdx >= slides.length) setSlideIdx(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  // Slider timer: pakai slideDurationMs (khusus perpindahan tipe slide)
  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;

    if (slides.length <= 1) return;

    const ms = Math.max(500, Number(slideDurationMs || 0) || 8000);
    timerRef.current = window.setInterval(() => {
      setSlideIdx((i) => (i + 1) % slides.length);
    }, ms);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [slides.length, slideDurationMs]);

  const activeSlide = slides[slideIdx] || null;

  return (
    <main className="min-h-screen bg-[#0047AB] text-white p-6">
      <div className="mx-auto max-w-full space-y-4">
        <TopBar
          dayDateText={dayDateText}
          hijriText={hijriText}
          timeText={timeText}
        />

        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          {/* LEFT: CMS SLIDER (Post / Schedule / Media / Donation) */}
          <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Informasi</div>
                <div className="mt-1 text-xs text-white/80">
                  Konten realtime dari CMS • Auto slide
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs text-white/70">
                  {slides.length ? `${slideIdx + 1}/${slides.length}` : "0/0"}
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[11px] text-white/85">
                  {activeSlide ? slideLabel(activeSlide.type) : "—"}
                </div>
              </div>
            </div>

            <div className="mt-4">
              {slides.length === 0 ? (
                <div className="rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-white/80">
                  Belum ada konten. Silakan buat post/schedule/media/donation di
                  CMS.
                </div>
              ) : activeSlide ? (
                <SlideRenderer
                  post={activeSlide.post}
                  type={activeSlide.type}
                  mediaIntervalMs={mediaIntervalMs}
                />
              ) : null}
            </div>

            {/* Dots */}
            {slides.length > 1 ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {slides.slice(0, 24).map((s, i) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSlideIdx(i)}
                    className={[
                      "h-2.5 w-2.5 rounded-full border transition",
                      i === slideIdx
                        ? "border-white/70 bg-white/80"
                        : "border-white/20 bg-white/10 hover:bg-white/20",
                    ].join(" ")}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
                {slides.length > 24 ? (
                  <div className="text-xs text-white/70 ml-2">
                    +{slides.length - 24} more
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* RIGHT: PRAYER TIMES */}
          <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur p-4">
            <div>
              <div className="text-sm font-semibold">Waktu Sholat</div>
              <div className="mt-1 text-xs text-white/80">
                {prayer?.Source ? `Sumber: ${prayer.Source}` : "Memuat..."}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <PrayerCard
                label="Subuh"
                time={prayer?.Fajr ?? "--:--"}
                active={currentPrayer === "Fajr"}
              />
              <PrayerCard
                label="Dzuhur"
                time={prayer?.Dhuhr ?? "--:--"}
                active={currentPrayer === "Dhuhr"}
              />
              <PrayerCard
                label="Ashar"
                time={prayer?.Asr ?? "--:--"}
                active={currentPrayer === "Asr"}
              />
              <PrayerCard
                label="Maghrib"
                time={prayer?.Maghrib ?? "--:--"}
                active={currentPrayer === "Maghrib"}
              />
              <PrayerCard
                label="Isya"
                time={prayer?.Isha ?? "--:--"}
                active={currentPrayer === "Isha"}
              />
              <PrayerCard
                label="Syuruq"
                time={prayer?.Sunrise ?? "--:--"}
                active={false}
              />
            </div>
          </div>
        </div>

        <div className="bottom-0 left-0">
          <RunningText
            text={
              tickerText?.trim()
                ? tickerText
                : "Selamat datang. Mohon matikan/heningkan ponsel. Jaga kebersihan dan ketertiban."
            }
          />
        </div>
      </div>
    </main>
  );
}
