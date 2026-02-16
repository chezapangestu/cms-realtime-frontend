"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "../../../components/Card";
import { Spinner } from "../../../components/Spinner";
import { formatIDR, parseIDR } from "../../../lib/idr";
import { useRouter, useSearchParams } from "next/navigation";
import { RichTextEditor } from "../../../components/RichTextEditor";
import { TabButton } from "./_components/TabButton";
import { DonationBlock } from "./_components/DonationBlock";
import {
  ScheduleEditor,
  ScheduleMetaEditor,
} from "./_components/ScheduleEditor";
import {
  SCHEDULE_KEY,
  SCHEDULE_TITLE_KEY,
  SCHEDULE_CAPTION_KEY,
  parseScheduleFromFields,
  getScheduleCountFromFields,
  toScheduleJson,
  type ScheduleRow,
} from "./_lib/schedule";

import {
  cleanStr,
  makeEmptyFields,
  getOrderValue,
  computeMaxFilledBlock,
} from "./_lib/helpers";

import {
  fetchPosts,
  createPost,
  updatePost,
  deletePost,
  patchPostFields,
  uploadMedia,
  type PostItem,
  type MediaType,
} from "./_lib/postsApi";

import { NoticeToast } from "./_components/NoticeToast";
import { useNotice, type Phase } from "./_lib/useNotice";

import { PostBlocksEditor } from "./_components/PostBlocksEditor";
import { PostMediaEditor } from "./_components/PostMediaEditor";
import { PostLayoutEditor } from "./_components/PostLayoutEditor";

import { useSocket } from "./_lib/socket";

// untuk tab di edit drawer
type PostsTab = "content" | "media" | "donation" | "layout" | "schedule";
type EditTab = "content" | "media" | "donation" | "layout" | "schedule";

function AccordionSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      className="group rounded-2xl border border-zinc-200 bg-white"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-900">{title}</div>
          {subtitle ? (
            <div className="mt-0.5 text-xs text-zinc-500">{subtitle}</div>
          ) : null}
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition group-open:rotate-180">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </summary>

      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

export default function AdminPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE!;

  // realtime socket (opsional untuk update list CMS juga)
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  const socket = useSocket(socketUrl);

  const [phase, setPhase] = useState<Phase>("idle");

  const {
    showNotice,
    statusText,
    errorText,
    isBusy,
    busyLabel,
    pushStatus,
    pushError,
    closeNotice,
    clearNotice,
  } = useNotice(phase);

  const isLoadingList = phase === "loading_list";

  // list
  const [posts, setPosts] = useState<PostItem[]>([]);

  // CREATE form state
  const [createMediaType, setCreateMediaType] = useState<MediaType>("images");
  const [createFields, setCreateFields] =
    useState<Record<string, string>>(makeEmptyFields);
  const [createImages, setCreateImages] = useState<FileList | null>(null);
  const [createVideo, setCreateVideo] = useState<File | null>(null);
  // CREATE visible blocks (default 1)
  const [createVisibleBlocks, setCreateVisibleBlocks] = useState(1);

  // EDIT drawer state
  const [editing, setEditing] = useState<PostItem | null>(null);
  const [editFields, setEditFields] =
    useState<Record<string, string>>(makeEmptyFields);
  const [editMediaType, setEditMediaType] = useState<MediaType>("images");
  const [editImages, setEditImages] = useState<FileList | null>(null);
  const [editVideo, setEditVideo] = useState<File | null>(null);
  // EDIT visible blocks (default 1, akan diset saat openEdit)
  const [editVisibleBlocks, setEditVisibleBlocks] = useState(1);

  const [editTab, setEditTab] = useState<EditTab>("content");

  const [createSchedule, setCreateSchedule] = useState<ScheduleRow[]>([]);
  const [editSchedule, setEditSchedule] = useState<ScheduleRow[]>([]);

  useEffect(() => {
    if (editing) setEditTab("content");
  }, [editing]);

  const fieldPairs = useMemo(
    () => Array.from({ length: 10 }).map((_, i) => i + 1),
    [],
  );

  function hasAnyText(fields: Record<string, string>) {
    return Object.values(fields).some((v) => cleanStr(v).length > 0);
  }

  async function refreshList() {
    setPhase("loading_list");
    pushStatus("Loading posts...");
    try {
      const data = await fetchPosts(apiBase);
      setPosts(data);
      clearNotice();
    } catch (e: any) {
      pushError(e?.message || "Failed to load posts");
    } finally {
      setPhase("idle");
    }
  }

  async function patchOrder(post: PostItem, newOrder: number) {
    const nextFields = {
      ...(post.fields || {}),
      display_order: String(newOrder),
    };

    // akan trigger realtime via server (kalau backend emit)
    await patchPostFields(apiBase, post.id, nextFields);
  }

  // initial load
  useEffect(() => {
    refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep CMS list in sync via socket (nice to have)
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
      setEditing((curr) => (curr?.id === id ? null : curr));
    };

    socket.on("post:upsert", onUpsert);
    socket.on("post:delete", onDelete);

    return () => {
      socket.off("post:upsert", onUpsert);
      socket.off("post:delete", onDelete);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => console.log("[socket] connected", socket.id);
    const onDisconnect = (r: any) => console.log("[socket] disconnected", r);
    const onError = (e: any) =>
      console.log("[socket] connect_error", e?.message || e);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onError);
    };
  }, [socket]);

  // open edit drawer
  function openEdit(p: PostItem) {
    clearNotice();
    setEditing(p);
    setEditFields({ ...makeEmptyFields(), ...(p.fields || {}) });
    setEditVisibleBlocks(computeMaxFilledBlock(p.fields));
    setEditSchedule(parseScheduleFromFields(p.fields));
    setEditTab("content");

    const mt = (p.media_type as MediaType | null) || "images";
    setEditMediaType(mt);

    // clear selected replacement media
    setEditImages(null);
    setEditVideo(null);
  }

  function closeEdit() {
    setEditing(null);
    setEditImages(null);
    setEditVideo(null);
    clearNotice();
    setEditSchedule([]);
  }

  async function handleCreate() {
    if (isBusy) return;

    clearNotice();

    const isImages =
      createMediaType === "images" || createMediaType === "popup_images";
    const isVideo =
      createMediaType === "video" || createMediaType === "popup_video";

    const hasMedia =
      (isImages && createImages && createImages.length > 0) ||
      (isVideo && !!createVideo);

    const hasSchedule = createSchedule.length > 0;

    if (!hasAnyText(createFields) && !hasMedia && !hasSchedule) {
      pushError(
        "Isi minimal 1 title/description, schedule, atau upload media.",
      );
      return;
    }

    try {
      let mediaType: MediaType | null = null;
      let mediaUrls: string[] = [];
      let mediaPaths: string[] = [];

      // upload optional
      if (hasMedia) {
        setPhase("uploading_create");
        pushStatus("Uploading file...");

        const up = await uploadMedia(
          apiBase,
          createMediaType,
          createImages,
          createVideo,
        );
        mediaType = up.mediaType;
        mediaUrls = up.mediaUrls;
        mediaPaths = up.mediaPaths;
      }

      setPhase("creating");
      pushStatus("Creating post & pushing realtime...");

      const payloadFields = { ...createFields };
      payloadFields[SCHEDULE_KEY] = toScheduleJson(createSchedule);

      await createPost(apiBase, {
        fields: payloadFields,
        mediaType,
        mediaUrls,
        mediaPaths,
      });

      pushStatus("Done.");
      setCreateFields(makeEmptyFields());
      setCreateImages(null);
      setCreateVideo(null);
      setCreateVisibleBlocks(1);
      setCreateSchedule([]);

      setTimeout(() => clearNotice(), 700);
    } catch (e: any) {
      pushError(e?.message || "Create error");
    } finally {
      setPhase("idle");
    }
  }

  async function handleUpdate() {
    if (!editing || isBusy) return;
    clearNotice();

    const isEditImages =
      editMediaType === "images" || editMediaType === "popup_images";
    const isEditVideo =
      editMediaType === "video" || editMediaType === "popup_video";

    const replaceMedia =
      (isEditImages && editImages && editImages.length > 0) ||
      (isEditVideo && !!editVideo);

    const hasSchedule = editSchedule.length > 0;

    if (!hasAnyText(editFields) && !replaceMedia && !hasSchedule) {
      pushError(
        "Isi minimal 1 title/description, schedule, atau upload media replacement.",
      );
      return;
    }

    try {
      const payload: any = { fields: { ...editFields } };

      // ✅ inject schedule sekali, tidak ketimpa
      payload.fields[SCHEDULE_KEY] = toScheduleJson(editSchedule);

      if (replaceMedia) {
        setPhase("uploading_update");
        pushStatus("Uploading replacement media...");

        const up = await uploadMedia(
          apiBase,
          editMediaType,
          editImages,
          editVideo,
        );
        payload.mediaType = up.mediaType;
        payload.mediaUrls = up.mediaUrls;
        payload.mediaPaths = up.mediaPaths;
      }

      setPhase("updating");
      pushStatus("Updating & pushing realtime...");

      const updated = await updatePost(apiBase, editing.id, payload);
      setEditing(updated);

      setEditImages(null);
      setEditVideo(null);

      pushStatus("Updated.");
      setTimeout(() => clearNotice(), 700);
    } catch (e: any) {
      pushError(e?.message || "Update error");
    } finally {
      setPhase("idle");
    }
  }

  async function handleDelete(id: string) {
    if (isBusy) return;

    const ok = confirm(
      "Delete post ini? Media yang terkait juga akan dihapus.",
    );
    if (!ok) return;

    pushStatus("Deleting...");
    setPhase("deleting");

    try {
      await deletePost(apiBase, id);
      pushStatus("Deleted.");
    } catch (e: any) {
      pushError(e?.message || "Delete error");
    } finally {
      setPhase("idle");
    }
  }

  function setMoneyField(
    setFields: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    key: string,
    raw: string,
  ) {
    const n = parseIDR(raw);
    setFields((prev) => ({ ...prev, [key]: String(n) }));
  }

  // UI helpers
  function headline(p: PostItem) {
    return cleanStr(p.fields?.title_1) || "Untitled";
  }

  function badge(p: PostItem) {
    const t = p.media_type;
    if (t === "images") return "Images Slider";
    if (t === "video") return "Video Autoplay";
    if (t === "popup_images") return "Popup Slider";
    if (t === "popup_video") return "Popup Video";

    const scheduleCount = getScheduleCountFromFields(p.fields || {});
    const hasAnyText = Object.keys(p.fields || {}).some((k) => {
      const v = cleanStr((p.fields || {})[k]);
      return (k.startsWith("title_") || k.startsWith("description_")) && v;
    });

    if (scheduleCount > 0 && !hasAnyText) return "Schedule";
    if (scheduleCount > 0 && hasAnyText) return "Text + Schedule";

    return "Text";
  }

  function buildPreview(p: PostItem) {
    const f = p.fields || {};

    const hasText =
      cleanStr(f.title_1).length > 0 ||
      cleanStr(f.description_1).length > 0 ||
      Object.keys(f).some(
        (k) =>
          (k.startsWith("title_") || k.startsWith("description_")) &&
          cleanStr(f[k]).length > 0,
      );

    const hasInfak =
      cleanStr(f.infak_title).length > 0 ||
      Number(f.infak_amount || 0) > 0 ||
      (f.infak_target_enabled === "true" &&
        Number(f.infak_target_amount || 0) > 0);

    const hasWakaf =
      cleanStr(f.wakaf_title).length > 0 ||
      Number(f.wakaf_amount || 0) > 0 ||
      (f.wakaf_target_enabled === "true" &&
        Number(f.wakaf_target_amount || 0) > 0);

    const hasZakat =
      cleanStr(f.zakat_title).length > 0 ||
      Number(f.zakat_amount || 0) > 0 ||
      (f.zakat_target_enabled === "true" &&
        Number(f.zakat_target_amount || 0) > 0);

    const mediaCount = Array.isArray(p.media_urls)
      ? p.media_urls.filter(Boolean).length
      : 0;

    const scheduleCount = getScheduleCountFromFields(f);

    const chips: { label: string; tone?: "neutral" | "good" | "info" }[] = [];

    if (scheduleCount > 0) {
      chips.push({ label: `Schedule ×${scheduleCount}`, tone: "info" });
    }

    // Donation
    if (hasInfak) chips.push({ label: "Infak", tone: "good" });
    if (hasWakaf) chips.push({ label: "Wakaf", tone: "good" });
    if (hasZakat) chips.push({ label: "Zakat", tone: "good" });

    // Media
    if (p.media_type === "images" && mediaCount > 0)
      chips.push({ label: `Slider ×${mediaCount}`, tone: "info" });

    if (p.media_type === "video" && mediaCount > 0)
      chips.push({ label: "Autoplay Video", tone: "info" });

    if (p.media_type === "popup_images" && mediaCount > 0) {
      const enabled = f.popup_enabled === "true";
      chips.push({
        label: `Popup Slider ×${mediaCount}`,
        tone: "info",
      });
      chips.push({
        label: enabled ? "Popup ON" : "Popup OFF",
        tone: enabled ? "info" : "neutral",
      });
    }

    if (p.media_type === "popup_video" && mediaCount > 0) {
      const enabled = f.popup_enabled === "true";
      chips.push({ label: "Popup Video", tone: "info" });
      chips.push({
        label: enabled ? "Popup ON" : "Popup OFF",
        tone: enabled ? "info" : "neutral",
      });
    }

    // Text
    if (hasText) chips.push({ label: "Title/Desc", tone: "neutral" });

    // headline short preview
    const title1 = cleanStr(f.title_1);
    const titlePreview = title1 ? title1.slice(0, 28) : "";

    const fullSpan = f.layout_full_span === "true";
    if (fullSpan) chips.push({ label: "Full Span", tone: "neutral" });

    return {
      chips,
      titlePreview,
    };
  }

  function Chip({
    children,
    tone = "neutral",
  }: {
    children: React.ReactNode;
    tone?: "neutral" | "good" | "info";
  }) {
    const cls =
      tone === "good"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : tone === "info"
          ? "border-sky-200 bg-sky-50 text-sky-800"
          : "border-zinc-200 bg-zinc-50 text-zinc-600";

    return (
      <span className={`rounded-full border px-2 py-0.5 text-xs ${cls}`}>
        {children}
      </span>
    );
  }

  const router = useRouter();
  const sp = useSearchParams();

  const initialTab = (sp.get("tab") as PostsTab) || "content";
  const [tab, setTab] = useState<PostsTab>(initialTab);

  function setTabAndUrl(next: PostsTab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    // gak bikin reload:
    router.replace(url.pathname + "?" + url.searchParams.toString());
  }

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      const oa = getOrderValue(a.fields);
      const ob = getOrderValue(b.fields);
      if (oa !== ob) return oa - ob;
      // tie-breaker: terbaru dulu
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });
  }, [posts]);

  async function movePost(postId: string, direction: "up" | "down") {
    if (isBusy) return;

    const idx = sortedPosts.findIndex((p) => p.id === postId);
    if (idx === -1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sortedPosts.length) return;

    const a = sortedPosts[idx];
    const b = sortedPosts[targetIdx];

    const orderA = getOrderValue(a.fields);
    const orderB = getOrderValue(b.fields);

    // kalau keduanya MAX_SAFE_INTEGER (belum punya order),
    // kita set dulu biar bisa di-swap dengan deterministik
    const base = 1000;
    const fixedOrderA =
      orderA === Number.MAX_SAFE_INTEGER ? base + idx : orderA;
    const fixedOrderB =
      orderB === Number.MAX_SAFE_INTEGER ? base + targetIdx : orderB;

    pushStatus("Reordering...");
    setPhase("reordering");

    // Optimistic UI (opsional tapi bikin terasa cepat)
    setPosts((prev) => {
      const map = new Map(prev.map((x) => [x.id, x]));
      const pa = map.get(a.id);
      const pb = map.get(b.id);
      if (!pa || !pb) return prev;

      map.set(a.id, {
        ...pa,
        fields: { ...(pa.fields || {}), display_order: String(fixedOrderB) },
      });
      map.set(b.id, {
        ...pb,
        fields: { ...(pb.fields || {}), display_order: String(fixedOrderA) },
      });

      return Array.from(map.values());
    });

    try {
      // Swap order di server (2 request)
      await patchOrder(a, fixedOrderB);
      await patchOrder(b, fixedOrderA);

      clearNotice();
    } catch (e: any) {
      // kalau gagal, reload list biar konsisten
      pushError(e?.message || "Reorder error");
      await refreshList();
    } finally {
      setPhase("idle");
    }
  }

  const isCreateImages =
    createMediaType === "images" || createMediaType === "popup_images";
  const isCreateVideo =
    createMediaType === "video" || createMediaType === "popup_video";

  const isEditImages =
    editMediaType === "images" || editMediaType === "popup_images";
  const isEditVideo =
    editMediaType === "video" || editMediaType === "popup_video";

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {/* <div>
          <h1 className="text-2xl font-semibold tracking-tight">CMS Admin</h1>
          <p className="text-sm text-zinc-500">
            List + Create + Edit + Delete. Update akan emit realtime otomatis.
          </p>
        </div> */}
        <div className="flex gap-2">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50"
          >
            Frontpage
          </a>
          <button
            onClick={refreshList}
            disabled={isBusy}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 disabled:opacity-70"
          >
            {isLoadingList ? <Spinner /> : null}
            Refresh
          </button>
        </div>
      </header>

      <NoticeToast
        open={showNotice}
        statusText={statusText}
        errorText={errorText}
        isBusy={isBusy}
        busyLabel={busyLabel}
        onClose={closeNotice}
      />

      {/* CREATE */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-900">
              Create New Post
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Gunakan tab untuk mengisi konten, media, donasi, dan layout.
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          <TabButton
            active={tab === "content"}
            onClick={() => setTabAndUrl("content")}
            title="Post"
            desc="Title & Description"
          />
          <TabButton
            active={tab === "schedule"}
            onClick={() => setTabAndUrl("schedule")}
            title="Schedule"
            desc="Imam Schedule"
          />
          <TabButton
            active={tab === "media"}
            onClick={() => setTabAndUrl("media")}
            title="Media"
            desc="Slider / Video / Pop-up"
          />
          <TabButton
            active={tab === "donation"}
            onClick={() => setTabAndUrl("donation")}
            title="Donation"
            desc="Infak / Wakaf / Zakat"
          />
          <TabButton
            active={tab === "layout"}
            onClick={() => setTabAndUrl("layout")}
            title="Layout"
            desc="Order & span"
          />
        </div>

        {/* Tab panels */}
        <div className="mt-4">
          {tab === "content" ? (
            <PostBlocksEditor
              fields={createFields}
              setFields={setCreateFields}
              visibleBlocks={createVisibleBlocks}
              setVisibleBlocks={setCreateVisibleBlocks}
              disabled={isBusy}
            />
          ) : null}

          {tab === "schedule" ? (
            <div className="grid gap-3">
              <ScheduleMetaEditor
                fields={createFields}
                setFields={setCreateFields}
                disabled={isBusy}
              />
              <ScheduleEditor
                value={createSchedule}
                onChange={setCreateSchedule}
                disabled={isBusy}
              />
            </div>
          ) : null}

          {tab === "media" ? (
            <PostMediaEditor
              mode="create"
              mediaType={createMediaType}
              setMediaType={setCreateMediaType}
              disabled={isBusy}
              onPickImages={setCreateImages}
              onPickVideo={setCreateVideo}
            />
          ) : null}

          {tab === "donation" ? (
            <div className="grid gap-3 md:grid-cols-3">
              <DonationBlock
                label="Infak"
                prefix="infak"
                fields={createFields}
                setFields={setCreateFields}
                disabled={isBusy}
              />
              <DonationBlock
                label="Wakaf"
                prefix="wakaf"
                fields={createFields}
                setFields={setCreateFields}
                disabled={isBusy}
              />
              <DonationBlock
                label="Zakat"
                prefix="zakat"
                fields={createFields}
                setFields={setCreateFields}
                disabled={isBusy}
              />
            </div>
          ) : null}

          {tab === "layout" ? (
            <PostLayoutEditor
              fields={createFields}
              setFields={setCreateFields}
              disabled={isBusy}
            />
          ) : null}
        </div>

        {/* CTA */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleCreate}
            disabled={isBusy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {phase === "uploading_create" || phase === "creating" ? (
              <>
                <Spinner className="border-zinc-600 border-t-white" />
                {phase === "uploading_create" ? "Uploading..." : "Creating..."}
              </>
            ) : (
              "Create & Push Realtime"
            )}
          </button>
        </div>
      </Card>

      {/* LIST */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-900">List</div>
          <div className="text-xs text-zinc-500">{posts.length} items</div>
        </div>

        <div className="mt-4 grid gap-3">
          {posts.length === 0 ? (
            <div className="text-sm text-zinc-500">Belum ada post.</div>
          ) : (
            sortedPosts.map((p, i) => {
              const preview = buildPreview(p);
              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 px-2 text-xs font-semibold text-zinc-700">
                        {i + 1}
                      </span>

                      <Chip tone="neutral">{badge(p)}</Chip>

                      {/* chips preview (maks 4 biar rapi) */}
                      {preview.chips.slice(0, 4).map((c, idx) => (
                        <Chip key={idx} tone={c.tone}>
                          {c.label}
                        </Chip>
                      ))}

                      {/* optional: judul singkat */}
                      {preview.titlePreview ? (
                        <span className="text-xs text-zinc-500 max-w-55">
                          • {preview.titlePreview}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Updated: {new Date(p.updated_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      onClick={() => movePost(p.id, "up")}
                      disabled={isBusy || i === 0}
                      className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-700 transition rotate-180">
                        <svg
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </div>
                    </button>

                    <button
                      onClick={() => movePost(p.id, "down")}
                      disabled={isBusy || i === sortedPosts.length - 1}
                      className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-700 transition rotate-360">
                        <svg
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </div>
                    </button>

                    <button
                      onClick={() => openEdit(p)}
                      disabled={isBusy}
                      className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 disabled:opacity-70"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(p.id)}
                      disabled={isBusy}
                      className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-70"
                    >
                      {phase === "deleting" ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* EDIT DRAWER */}
      {editing ? (
        <div className="fixed inset-0 z-50">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditing(null)}
          />

          {/* drawer */}
          <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
            <div className="border-b border-zinc-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-zinc-900">
                    Edit Post
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    ID: <span className="font-mono">{editing.id}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  Close
                </button>
              </div>

              {/* Tabs */}
              <div className="mt-4 grid gap-2 sm:grid-cols-5">
                <TabButton
                  active={editTab === "content"}
                  onClick={() => setEditTab("content")}
                  title="Post"
                  desc="Title & Description"
                />
                <TabButton
                  active={editTab === "schedule"}
                  onClick={() => setEditTab("schedule")}
                  title="Schedule"
                  desc="Imam Schedule"
                />
                <TabButton
                  active={editTab === "media"}
                  onClick={() => setEditTab("media")}
                  title="Media"
                  desc="Slider / Video / Pop-up"
                />
                <TabButton
                  active={editTab === "donation"}
                  onClick={() => setEditTab("donation")}
                  title="Donation"
                  desc="Infak / Wakaf / Zakat"
                />
                <TabButton
                  active={editTab === "layout"}
                  onClick={() => setEditTab("layout")}
                  title="Layout"
                  desc="Order & span"
                />
              </div>
            </div>

            {/* Body */}
            <div className="p-5">
              {/* CONTENT TAB */}
              {editTab === "content" ? (
                <PostBlocksEditor
                  fields={editFields}
                  setFields={setEditFields}
                  visibleBlocks={editVisibleBlocks}
                  setVisibleBlocks={setEditVisibleBlocks}
                  disabled={isBusy}
                />
              ) : null}

              {editTab === "schedule" ? (
                <div className="grid gap-3">
                  <ScheduleMetaEditor
                    fields={editFields}
                    setFields={setEditFields}
                    disabled={isBusy}
                  />
                  <ScheduleEditor
                    value={editSchedule}
                    onChange={setEditSchedule}
                    disabled={isBusy}
                  />
                </div>
              ) : null}

              {/* MEDIA TAB */}
              {editTab === "media" ? (
                <PostMediaEditor
                  mode="edit"
                  mediaType={editMediaType}
                  setMediaType={setEditMediaType}
                  disabled={isBusy}
                  existingMediaUrls={editing.media_urls}
                  onPickImages={setEditImages}
                  onPickVideo={setEditVideo}
                />
              ) : null}

              {/* DONATION TAB */}
              {editTab === "donation" ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <DonationBlock
                    label="Infak"
                    prefix="infak"
                    fields={editFields}
                    setFields={setEditFields}
                    disabled={isBusy}
                  />
                  <DonationBlock
                    label="Wakaf"
                    prefix="wakaf"
                    fields={editFields}
                    setFields={setEditFields}
                    disabled={isBusy}
                  />
                  <DonationBlock
                    label="Zakat"
                    prefix="zakat"
                    fields={editFields}
                    setFields={setEditFields}
                    disabled={isBusy}
                  />
                </div>
              ) : null}

              {/* LAYOUT TAB */}
              {editTab === "layout" ? (
                <PostLayoutEditor
                  fields={editFields}
                  setFields={setEditFields}
                  disabled={isBusy}
                />
              ) : null}
            </div>

            {/* Footer actions */}
            <div className="sticky bottom-0 border-t border-zinc-200 bg-white p-5">
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  disabled={isBusy}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(editing.id)}
                  disabled={isBusy}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                >
                  Delete
                </button>

                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={isBusy}
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
