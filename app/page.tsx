"use client";

import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Card } from "./components/Card";
import { ImageSlider } from "./components/ImageSlider";
import { formatIDR } from "./lib/idr";
import { PopupOverlay } from "./components/PopupOverlay";

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

  return `${dd}/${mm}/${yyyy}, ${String(hh12).padStart(2, "0")}:${min}:${sec} ${ampm}`;
}

function getOrderValue(fields?: Record<string, string>) {
  const raw = fields?.["display_order"];
  const n = raw !== undefined ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER; // kosong = paling bawah
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

export default function HomePage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE!;
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL!;
  const [posts, setPosts] = useState<PostItem[]>([]);

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      const oa = getOrderValue(a.fields);
      const ob = getOrderValue(b.fields);

      if (oa !== ob) return oa - ob;

      // tie-breaker: updated terbaru dulu
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

  const socket: Socket = useMemo(
    () => io(socketUrl, { transports: ["websocket"] }),
    [socketUrl],
  );

  useEffect(() => {
    (async () => {
      const res = await fetch(`${apiBase}/posts`, { cache: "no-store" });
      const data = await res.json();
      setPosts(data);
    })();
  }, [apiBase]);

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

  useEffect(() => {
    socket.on("post:upsert", (post: PostItem) => {
      setPosts((prev) => {
        const idx = prev.findIndex((p) => p.id === post.id);
        if (idx === -1) return [post, ...prev];
        const copy = [...prev];
        copy[idx] = post;
        return copy;
      });
    });

    socket.on("post:delete", ({ id }: { id: string }) => {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    });

    return () => {
      socket.off("post:upsert");
      socket.off("post:delete");
      socket.disconnect();
    };
  }, [socket]);

  return (
    <main className="space-y-6">
      <PopupOverlay post={popupPost} />
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Masjid Al-Ukhuwah
          </h1>
          <p className="text-sm text-zinc-500">
            Pesona Bali City View Residence Blok B.18 Jl. Waruga Jaya No. 108,
            Ciwaruga, Kec. Parongpong, Kab. Bandung Barat, Jawa Barat - 40559
          </p>
        </div>

        {/* <a
          href="/admin"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50"
        >
          CMS
        </a> */}
      </header>

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

          const headline = getVal(p.fields, "title_1") || "Untitled";

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

          return (
            <div key={p.id} className={fullSpan ? "md:col-span-2" : ""}>
              <Card>
                <div className="space-y-4">
                  <div>
                    {/* <div className="text-lg font-semibold">{headline}</div> */}
                    <div className="mt-1 text-xs text-zinc-500">
                      Updated: {formatDateTimeDMY12H(p.updated_at)}
                    </div>
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
                  {/* Donation cards */}
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
                  {blocks.length > 0 ? (
                    <div className="grid gap-2">
                      {blocks.map((b) => (
                        <div
                          key={b.n}
                          className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"
                        >
                          {b.t ? (
                            <div className="text-2xl font-semibold text-zinc-900">
                              {b.t}
                            </div>
                          ) : null}
                          {b.d ? (
                            <div
                              className={`mt-1 text-md text-zinc-700 ${b.t ? "" : "mt-0"}`}
                            >
                              {b.d}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-500">
                      Tidak ada title/description yang diisi.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </main>
  );
}
