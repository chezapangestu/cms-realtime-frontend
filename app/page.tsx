"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card } from "./components/Card";
import { ImageSlider } from "./components/ImageSlider";
import { formatIDR } from "./lib/idr";
import { PopupOverlay } from "./components/PopupOverlay";
import { sanitizeHtml } from "./lib/sanitize.client";
import { getSocket } from "./lib/socket.client";

type PostItem = {
  id: string;
  fields?: Record<string, string>;
  media_type?: "images" | "video" | "popup_images" | "popup_video" | null;
  media_urls?: string[] | null;
  created_at: string;
  updated_at: string;
};

function getVal(fields: Record<string, string> | undefined, key: string) {
  return (fields?.[key] || "").trim();
}

function formatDateTimeDMY12H(iso: string) {
  const d = new Date(iso);

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  const hh24 = d.getHours();
  const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12;
  const min = String(d.getMinutes()).padStart(2, "0");
  const sec = String(d.getSeconds()).padStart(2, "0");
  const ampm = hh24 >= 12 ? "PM" : "AM";

  return `${dd}/${mm}/${yyyy}, ${String(hh12).padStart(
    2,
    "0",
  )}:${min}:${sec} ${ampm}`;
}

function getOrderValue(fields?: Record<string, string>) {
  const raw = fields?.["display_order"];
  const n = raw !== undefined ? Number(raw) : Number.NaN;
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

function DonationView({
  label,
  prefix,
  fields,
}: {
  label: string;
  prefix: "infak" | "wakaf" | "zakat";
  fields?: Record<string, string>;
}) {
  const title = (fields?.[`${prefix}_title`] || "").trim();
  const amount = Number(fields?.[`${prefix}_amount`] || 0);
  const targetEnabled = fields?.[`${prefix}_target_enabled`] === "true";
  const target = Number(fields?.[`${prefix}_target_amount`] || 0);

  const hasAnything =
    title.length > 0 || amount > 0 || (targetEnabled && target > 0);
  if (!hasAnything) return null;

  const progress =
    targetEnabled && target > 0
      ? Math.min(100, Math.round((amount / target) * 100))
      : 0;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-xs font-medium text-zinc-500">{label}</div>

      <div className="mt-1 text-2xl font-semibold text-zinc-900">
        {title || label}
      </div>

      <div className="mt-2 text-5xl text-zinc-700 font-bold">
        {formatIDR(amount)}
      </div>

      {targetEnabled && target > 0 ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xl text-zinc-500 font-bold">
            <span>Target {formatIDR(target)}</span>
            <span>{progress}%</span>
          </div>

          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-zinc-900"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-2 text-lg text-zinc-500">
            {formatIDR(amount)} / {formatIDR(target)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type PopupPost = Omit<PostItem, "media_type"> & {
  media_type?: "popup_images" | "popup_video" | null;
};

const SCHEDULE_KEY = "schedule_json";

type ScheduleRow = {
  dayName: string;
  hijriahDay: number;
  dateM: string; // YYYY-MM-DD
  imamName: string;
};

function parseSchedule(fields?: Record<string, string>): ScheduleRow[] {
  const raw = (fields?.[SCHEDULE_KEY] || "").trim();
  if (!raw) return [];

  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];

    return arr
      .map((x) => ({
        dayName: String(x?.dayName ?? "").trim(),
        hijriahDay: Number(x?.hijriahDay ?? x?.hijirahDay ?? 0),
        dateM: String(x?.dateM ?? "").trim(),
        imamName: String(x?.imamName ?? "").trim(),
      }))
      .filter((r) => r.dayName || r.imamName || r.dateM || r.hijriahDay)
      .sort((a, b) => {
        const da = Number(a.hijriahDay || 0);
        const db = Number(b.hijriahDay || 0);
        if (da && db && da !== db) return da - db;

        if (a.dateM && b.dateM) return a.dateM.localeCompare(b.dateM);
        if (a.dateM) return -1;
        if (b.dateM) return 1;
        return 0;
      });
  } catch {
    return [];
  }
}

function formatDateID(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateISO;

  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ScheduleTable({
  rows,
  title,
  caption,
}: {
  rows: ScheduleRow[];
  title: string;
  caption?: string;
}) {
  if (!rows.length) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-sm font-semibold text-zinc-900">{title}</div>

      {caption ? (
        <div className="mt-1 text-xs text-zinc-500">{caption}</div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[720px] w-full border-collapse">
          <thead className="bg-zinc-50 text-xs text-zinc-600">
            <tr>
              <th className="p-2 text-left">Hari</th>
              <th className="p-2 text-left">Hijriah (1447H)</th>
              <th className="p-2 text-left">Masehi (2026M)</th>
              <th className="p-2 text-left">Nama</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-200 text-sm">
            {rows.map((r, idx) => (
              <tr key={idx} className="align-top">
                <td className="p-2 font-medium text-zinc-900">
                  {r.dayName || "-"}
                </td>
                <td className="p-2 text-zinc-700">
                  {r.hijriahDay ? r.hijriahDay : "-"}
                </td>
                <td className="p-2 text-zinc-700">
                  {r.dateM ? formatDateID(r.dateM) : "-"}
                </td>
                <td className="p-2 text-zinc-900">{r.imamName || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
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

export default function HomePage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "";
  const [posts, setPosts] = useState<PostItem[]>([]);

  const fetchPosts = useCallback(async () => {
    if (!apiBase) return;
    try {
      const res = await fetch(`${apiBase}/posts`, { cache: "no-store" });
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch {}
  }, [apiBase]);

  // fetch awal
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // socket listeners (stable singleton)
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onConnect = () => {
      console.log("[socket] connected", socket.id);
      fetchPosts(); // sync ulang setelah reconnect
    };
    const onDisconnect = (r: any) => console.log("[socket] disconnected", r);
    const onConnectError = (e: any) =>
      console.log("[socket] connect_error", e?.message || e);

    const onUpsert = (post: PostItem) => {
      console.log("[socket] post:upsert", post?.id, post?.updated_at);
      if (!post?.id) return;
      setPosts((prev) => {
        const idx = prev.findIndex((p) => p.id === post.id);
        if (idx === -1) return [post, ...prev];
        const copy = [...prev];
        copy[idx] = post;
        return copy;
      });
    };

    const onDelete = ({ id }: { id: string }) => {
      console.log("[socket] post:delete", id);
      if (!id) return;
      setPosts((prev) => prev.filter((p) => p.id !== id));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    socket.on("post:upsert", onUpsert);
    socket.on("post:delete", onDelete);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);

      socket.off("post:upsert", onUpsert);
      socket.off("post:delete", onDelete);

      // jangan disconnect: biar koneksi tetap hidup
    };
  }, [fetchPosts]);

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      const oa = getOrderValue(a.fields);
      const ob = getOrderValue(b.fields);
      if (oa !== ob) return oa - ob;
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });
  }, [posts]);

  const frontpagePosts = useMemo(() => {
    return sortedPosts.filter(
      (p) => p.media_type !== "popup_images" && p.media_type !== "popup_video",
    );
  }, [sortedPosts]);

  const popupPost = useMemo<PopupPost | null>(() => {
    const candidates = posts.filter(
      (p): p is PopupPost =>
        (p.media_type === "popup_images" || p.media_type === "popup_video") &&
        p.fields?.["popup_enabled"] === "true",
    );

    const sorted = [...candidates].sort((a, b) => {
      const oa = getOrderValue(a.fields);
      const ob = getOrderValue(b.fields);
      if (oa !== ob) return oa - ob;
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });

    return sorted[0] || null;
  }, [posts]);

  return (
    <main className="space-y-6">
      <PopupOverlay post={popupPost} />

      <div className="grid gap-4 md:grid-cols-2">
        {frontpagePosts.map((p) => {
          const fullSpan = p.fields?.["layout_full_span"] === "true";
          const mediaType = p.media_type || null;
          const mediaUrls = Array.isArray(p.media_urls)
            ? p.media_urls.filter(Boolean)
            : [];

          const blocks = Array.from({ length: 10 })
            .map((_, i) => {
              const n = i + 1;
              const t = getVal(p.fields, `title_${n}`);
              const d = getVal(p.fields, `description_${n}`);
              return { n, t, d };
            })
            .filter((x) => x.t || x.d);

          const hasDonation =
            getVal(p.fields, "infak_title").length > 0 ||
            Number(p.fields?.["infak_amount"] || 0) > 0 ||
            (p.fields?.["infak_target_enabled"] === "true" &&
              Number(p.fields?.["infak_target_amount"] || 0) > 0) ||
            getVal(p.fields, "wakaf_title").length > 0 ||
            Number(p.fields?.["wakaf_amount"] || 0) > 0 ||
            (p.fields?.["wakaf_target_enabled"] === "true" &&
              Number(p.fields?.["wakaf_target_amount"] || 0) > 0) ||
            getVal(p.fields, "zakat_title").length > 0 ||
            Number(p.fields?.["zakat_amount"] || 0) > 0 ||
            (p.fields?.["zakat_target_enabled"] === "true" &&
              Number(p.fields?.["zakat_target_amount"] || 0) > 0);

          const scheduleRows = parseSchedule(p.fields);
          const hasSchedule = scheduleRows.length > 0;

          const scheduleSectionTitle =
            getVal(p.fields, "schedule_section_title") || "Schedule";
          const scheduleSectionCaption =
            getVal(p.fields, "schedule_section_caption") || "";

          return (
            <div key={p.id} className={fullSpan ? "md:col-span-2" : ""}>
              <Card>
                <div className="space-y-4">
                  <div className="mt-1 text-xs text-zinc-500">
                    Updated: {formatDateTimeDMY12H(p.updated_at)}
                  </div>

                  {mediaUrls.length > 0 && mediaType === "images" ? (
                    <ImageSlider urls={mediaUrls} intervalMs={4000} />
                  ) : mediaUrls.length > 0 && mediaType === "video" ? (
                    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-black">
                      <div className="aspect-video w-full">
                        <video
                          src={mediaUrls[0]}
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  ) : null}

                  {hasDonation ? (
                    <div className="grid gap-3 sm:grid-cols-1">
                      <DonationView
                        label="Infak"
                        prefix="infak"
                        fields={p.fields}
                      />
                      <DonationView
                        label="Wakaf"
                        prefix="wakaf"
                        fields={p.fields}
                      />
                      <DonationView
                        label="Zakat"
                        prefix="zakat"
                        fields={p.fields}
                      />
                    </div>
                  ) : null}

                  {hasSchedule ? (
                    <ScheduleTable
                      rows={scheduleRows}
                      title={scheduleSectionTitle}
                      caption={scheduleSectionCaption}
                    />
                  ) : null}

                  {blocks.length > 0 ? (
                    <div className="grid gap-2">
                      {blocks.map((b) => (
                        <div
                          key={b.n}
                          className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                        >
                          {b.t ? (
                            <div className="text-2xl font-semibold text-zinc-900">
                              {b.t}
                            </div>
                          ) : null}

                          {b.d ? (
                            <div className={`${b.t ? "mt-2" : ""}`}>
                              <DescriptionView html={b.d} />
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </main>
  );
}
