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
import qrinfak from "../../public/qr-infak.png";
import { sanitizeHtml } from "../lib/sanitize";

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

function formatIDR(n: number) {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n || 0);
  } catch {
    return `Rp ${(n || 0).toLocaleString("id-ID")}`;
  }
}

function toBool(v: any) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "")
    .toLowerCase()
    .trim();
  return s === "true" || s === "1" || s === "yes" || s === "on";
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

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
      <div className="h-10 w-10 rounded-2xl bg-white/15 border border-white/20 sm:block hidden">
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
        <div className="font-semibold leading-tight sm:text-2xl">
          {" "}
          Masjid Al Ukhuwah{" "}
        </div>{" "}
        <div className="sm:text-xl text-white/80">
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
    <div className="rounded-3xl border border-white/15 bg-white/20 backdrop-blur p-4">
      <div className="grid grid-cols-3 items-center gap-3">
        <div className="min-w-0">
          <div className="sm:text-xl font-semibold">{dayDateText}</div>
          <div className="mt-0.5 sm:text-xl text-white/80">{hijriText}</div>
        </div>

        <LogoCenter />

        <div className="flex justify-end">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2">
            <div className="sm:text-4xl font-semibold tabular-nums">
              {timeText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DescriptionView({ html }: { html: string }) {
  const safe = sanitizeHtml(html || "");
  return (
    <div
      className={[
        "prose prose-zinc max-w-none",
        "prose-p:my-2 prose-li:my-1",
        "prose-a:text-zinc-900 prose-a:underline",
        "prose-strong:text-zinc-900",
        "prose-blockquote:border-l-zinc-200 prose-blockquote:text-zinc-600",
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

function ScheduleTableLanding({
  rows,
  title,
  caption,
}: {
  rows: ScheduleRow[];
  title: string;
  caption?: string;
}) {
  if (!rows.length) return null;

  const today = DateTime.now().toFormat("yyyy-MM-dd");

  return (
    <div className="grid rounded-2xl border border-white/15 bg-white/5 p-4 overflow-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-base font-semibold">{title}</div>

        {caption ? (
          <div className="mt-1 text-xs text-white/75">{stripHtml(caption)}</div>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[820px] w-full border-collapse">
          <thead className="bg-white/10 text-xs text-white/80">
            <tr>
              <th className="p-2 text-left sm:text-xl font-semibold">Hari</th>
              <th className="p-2 text-left sm:text-xl font-semibold">
                Hijriah
              </th>
              <th className="p-2 text-left sm:text-xl font-semibold">Masehi</th>
              <th className="p-2 text-left sm:text-xl font-semibold">Nama</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/10 text-sm">
            {rows.map((r, idx) => {
              const isToday = r.dateM === today; // Cek apakah tanggal sama dengan hari ini

              return (
                <tr
                  key={idx}
                  className={`align-top ${
                    isToday ? "bg-cyan-600" : "" // Highlight jika sama dengan hari ini
                  }`}
                >
                  <td className="p-2 font-medium text-white sm:text-2xl">
                    {r.dayName || "-"}
                  </td>
                  <td className="p-2 text-white/85 sm:text-2xl">
                    {r.hijriahDay || "-"}
                  </td>
                  <td className="p-2 text-white/85 sm:text-2xl">
                    {r.dateM ? formatDateID(r.dateM) : "-"}
                  </td>
                  <td className="p-2 text-white sm:text-2xl">
                    {r.imamName || "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
          "text-xl font-medium",
          active ? "opacity-80" : "text-white/80",
        ].join(" ")}
      >
        {label}
      </div>
      <div className="mt-2 text-4xl font-semibold tabular-nums">{time}</div>
    </div>
  );
}

function RunningText({ text }: { text: string }) {
  return (
    <div className=" border border-white/15 bg-black overflow-hidden">
      <div className="whitespace-nowrap py-3">
        <div className="animate-marquee inline-block px-6 text-3xl font-medium text-white/95">
          {text}
        </div>
        <div className="animate-marquee inline-block px-6 text-3xl font-medium text-white/95">
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
    landing_background_url:
      typeof fields?.landing_background_url === "string"
        ? fields.landing_background_url
        : "",
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
    (toBool(f.infak_target_enabled) &&
      Number(f.infak_target_amount || 0) > 0) ||
    (toBool(f.wakaf_target_enabled) &&
      Number(f.wakaf_target_amount || 0) > 0) ||
    (toBool(f.zakat_target_enabled) && Number(f.zakat_target_amount || 0) > 0);

  if (hasDonation) types.push("donation");

  return types;
}

function slideLabel(type: SlideType) {
  if (type === "post") return "Post";
  if (type === "schedule") return "Schedule";
  if (type === "media") return "Media";
  return "Donation";
}

type ScheduleRow = {
  dayName?: string;
  hijriahDay?: string;
  dateM?: string; // ISO atau string tanggal
  imamName?: string;
};

function formatDateID(input: string) {
  // input biasanya "2026-02-16" atau ISO; kita bikin output "16 Feb 2026"
  try {
    const dt = DateTime.fromISO(input, { zone: "Asia/Jakarta" });
    if (!dt.isValid) return input;
    return dt.setLocale("id").toFormat("dd LLL yyyy");
  } catch {
    return input;
  }
}

function parseScheduleRows(raw: string): ScheduleRow[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // normalize key biar toleran kalau struktur beda
    return parsed.map((x: any) => ({
      dayName: cleanStr(x?.dayName ?? x?.day_name ?? x?.hari),
      hijriahDay: cleanStr(x?.hijriahDay ?? x?.hijriah_day ?? x?.hijriah),
      dateM: cleanStr(x?.dateM ?? x?.date_m ?? x?.masehi ?? x?.date),
      imamName: cleanStr(x?.imamName ?? x?.imam_name ?? x?.name ?? x?.nama),
    }));
  } catch {
    return [];
  }
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
    // const desc = stripHtml(cleanStr(f.description_1) || "");
    const desc = f.description_1 || "";
    return (
      <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
        <div className="sm:text-4xl font-semibold">{title}</div>
        {desc ? (
          <div className="mt-1 sm:text-2xl text-white/85 line-clamp-6">
            <DescriptionView html={desc} />
          </div>
        ) : null}
      </div>
    );
  }

  if (type === "schedule") {
    const title = cleanStr(f.schedule_title) || "Jadwal";
    const caption = cleanStr(f.schedule_caption) || "";
    const raw = cleanStr(f.schedule_json) || "[]";

    const rows = parseScheduleRows(raw);

    return <ScheduleTableLanding rows={rows} title={title} caption={caption} />;
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
        {/* <div className="flex items-center justify-between gap-3">
          <div className="text-base font-semibold">Media</div>
          <div className="text-xs text-white/70">
            <span className="font-mono">{mt}</span> • {urls.length} item
          </div>
        </div> */}

        <div className="">
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
  type DonationItem = {
    key: "infak" | "wakaf" | "zakat";
    label: string;
    title?: string;
    amount: number;
    targetEnabled: boolean;
    target: number;
  };

  const items: DonationItem[] = [];

  const makeItem = (key: DonationItem["key"], label: string) => {
    const title = cleanStr(f[`${key}_title`]);
    const amount = Number(f[`${key}_amount`] || 0);

    const targetEnabled = toBool(f[`${key}_target_enabled`]);
    const target = Number(f[`${key}_target_amount`] || 0);

    const shouldShow =
      title.length > 0 || amount > 0 || (targetEnabled && target > 0);

    if (!shouldShow) return;

    items.push({ key, label, title, amount, targetEnabled, target });
  };

  makeItem("infak", "Infak");
  makeItem("wakaf", "Wakaf");
  makeItem("zakat", "Zakat");

  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
      <div className="text-base font-semibold">Donation</div>
      <div className="grid sm:grid-cols-2 justify-items-end ">
        <div className="mt-3 grid gap-2 sm:grid-cols-1">
          {items.length ? (
            items.map((x) => (
              <div
                key={x.label}
                className="rounded-2xl border border-white/15 bg-white/10 p-3"
              >
                <div className="sm:text-xl text-white/80">{x.label}</div>
                <div className="mt-1 sm:text-4xl font-semibold line-clamp-2">
                  {x.title || "-"}
                </div>
                <div className="mt-1 sm:text-6xl font-bold text-red-600 tabular-nums">
                  {x.amount > 0 ? formatIDR(x.amount) : ""}
                </div>
                {x.targetEnabled && x.target > 0
                  ? (() => {
                      const progress = clamp(
                        Math.round((x.amount / x.target) * 100),
                        0,
                        999,
                      );
                      return (
                        <div className="mt-3">
                          <div className="flex items-center justify-between sm:text-4xl text-[#cbf826] font-semibold">
                            <span>Target {formatIDR(x.target)}</span>
                            <span className="tabular-nums">{progress}%</span>
                          </div>

                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/15">
                            <div
                              className="h-full rounded-full bg-white/85"
                              style={{ width: `${clamp(progress, 0, 100)}%` }}
                            />
                          </div>

                          <div className="mt-2 sm:text-3xl text-white/75 tabular-nums">
                            {formatIDR(x.amount)} / {formatIDR(x.target)}
                          </div>
                        </div>
                      );
                    })()
                  : null}
              </div>
            ))
          ) : (
            <div className="text-sm text-white/80">
              Tidak ada data donation.
            </div>
          )}
        </div>
        <div className="mt-2">
          <Image src={qrinfak} width={400} height={400} alt="QR Infak" />
        </div>
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

  const [landingBackgroundUrl, setLandingBackgroundUrl] = useState<string>("");

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

      setLandingBackgroundUrl(String(s.landing_background_url || ""));
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

      setLandingBackgroundUrl(String(s.landing_background_url || ""));
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

  const resolvedBackgroundUrl =
    landingBackgroundUrl?.trim() || "/background-4.jpg";

  const mainBgStyle = {
    backgroundImage: `url("${resolvedBackgroundUrl.replace(/"/g, '\\"')}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  } as const;

  return (
    // <main className="min-h-screen bg-[#0047AB] text-white p-6">
    <main className="min-h-screen text-white p-6" style={mainBgStyle}>
      <div className="mx-auto max-w-full space-y-4">
        <TopBar
          dayDateText={dayDateText}
          hijriText={hijriText}
          timeText={timeText}
        />

        <div className="grid gap-4 lg:grid-cols-[1.6fr_0.5fr]">
          {/* LEFT: CMS SLIDER (Post / Schedule / Media / Donation) */}
          <div className="rounded-3xl border border-white/15 bg-black/40 backdrop-blur p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Informasi</div>
                <div className="mt-1 text-xs text-white/80">
                  Dapatkan informasi terbaru seputar kegiatan, jadwal, media,
                  dan donasi di Masjid Al Ukhuwah.
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
          <div className="rounded-3xl border border-white/15 bg-black/40 backdrop-blur p-4">
            <div>
              <div className="text-sm font-semibold">Waktu Sholat</div>
              <div className="mt-1 text-xs text-white/80">
                {prayer?.Source ? `Sumber: ${prayer.Source}` : "Memuat..."}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <PrayerCard
                label="Imsak"
                time={prayer?.Imsak ?? "--:--"}
                active={false}
              />
              <PrayerCard
                label="Subuh"
                time={prayer?.Fajr ?? "--:--"}
                active={currentPrayer === "Fajr"}
              />
              <PrayerCard
                label="Syuruq"
                time={prayer?.Sunrise ?? "--:--"}
                active={false}
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
            </div>
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 w-full">
        <RunningText
          text={
            tickerText?.trim()
              ? tickerText
              : "Selamat datang. Mohon matikan/heningkan ponsel. Jaga kebersihan dan ketertiban."
          }
        />
      </div>
    </main>
  );
}
