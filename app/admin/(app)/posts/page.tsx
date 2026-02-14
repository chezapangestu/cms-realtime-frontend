"use client";

import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Card } from "../../../components/Card";
import { Spinner } from "../../../components/Spinner";
import { formatIDR, parseIDR } from "../../../lib/idr";
import { useRouter, useSearchParams } from "next/navigation";
import { RichTextEditor } from "../../../components/RichTextEditor";

type MediaType = "images" | "video" | "popup_images" | "popup_video";

// untuk tab di edit drawer
type PostsTab = "content" | "media" | "donation" | "layout" | "schedule";
type EditTab = "content" | "media" | "donation" | "layout" | "schedule";

type PostItem = {
  id: string;
  fields?: Record<string, string>;
  media_type?: MediaType | null;
  media_urls?: string[] | null;
  media_paths?: string[] | null;
  created_at: string;
  updated_at: string;
};

type Phase =
  | "idle"
  | "loading_list"
  | "uploading_create"
  | "creating"
  | "uploading_update"
  | "updating"
  | "deleting"
  | "reordering";

function cleanStr(v: unknown) {
  return String(v ?? "").trim();
}

function makeEmptyFields() {
  const init: Record<string, string> = {};
  for (let i = 1; i <= 10; i++) {
    init[`title_${i}`] = "";
    init[`description_${i}`] = "";
  }
  return init;
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function DonationBlock({
  label,
  prefix,
  fields,
  setFields,
  disabled,
}: {
  label: string;
  prefix: "infak" | "wakaf" | "zakat";
  fields: Record<string, string>;
  setFields: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  disabled: boolean;
}) {
  const titleKey = `${prefix}_title`;
  const amountKey = `${prefix}_amount`;
  const targetEnabledKey = `${prefix}_target_enabled`;
  const targetKey = `${prefix}_target_amount`;

  const title = fields[titleKey] || "";
  const amount = Number(fields[amountKey] || 0);
  const targetEnabled = fields[targetEnabledKey] === "true";
  const target = Number(fields[targetKey] || 0);

  const progress =
    targetEnabled && target > 0
      ? Math.min(100, Math.round((amount / target) * 100))
      : 0;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-sm font-semibold text-zinc-900">{label}</div>

      <label className="mt-3 block text-sm font-medium text-zinc-800">
        Title
      </label>
      <input
        value={title}
        disabled={disabled}
        onChange={(e) =>
          setFields((prev) => ({ ...prev, [titleKey]: e.target.value }))
        }
        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
        placeholder={`Judul ${label}`}
      />

      <label className="mt-3 block text-sm font-medium text-zinc-800">
        Nominal Terkumpul (Rp)
      </label>
      <input
        value={formatIDR(amount)}
        disabled={disabled}
        inputMode="numeric"
        onChange={(e) =>
          setFields((prev) => ({
            ...prev,
            [amountKey]: String(parseIDR(e.target.value)),
          }))
        }
        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
        placeholder="Rp 0"
      />

      <div className="mt-3 flex items-center gap-2">
        <input
          id={`${prefix}-target`}
          type="checkbox"
          checked={targetEnabled}
          disabled={disabled}
          onChange={(e) =>
            setFields((prev) => ({
              ...prev,
              [targetEnabledKey]: String(e.target.checked),
              // kalau dimatikan, target tetap disimpan (tidak dihapus) biar fleksibel
            }))
          }
          className="h-4 w-4 rounded border-zinc-300"
        />
        <label htmlFor={`${prefix}-target`} className="text-sm text-zinc-700">
          Enable Target Nominal
        </label>
      </div>

      {targetEnabled ? (
        <>
          <label className="mt-3 block text-sm font-medium text-zinc-800">
            Target Nominal (Rp)
          </label>
          <input
            value={formatIDR(target)}
            disabled={disabled}
            inputMode="numeric"
            onChange={(e) =>
              setFields((prev) => ({
                ...prev,
                [targetKey]: String(parseIDR(e.target.value)),
              }))
            }
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
            placeholder="Rp 0"
          />

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-zinc-900"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              {formatIDR(amount)} / {formatIDR(target)}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

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

const SCHEDULE_KEY = "schedule_json";
const SCHEDULE_TITLE_KEY = "schedule_section_title";
const SCHEDULE_CAPTION_KEY = "schedule_section_caption";

function getScheduleCount(fields?: Record<string, string>) {
  const raw = (fields?.[SCHEDULE_KEY] || "").trim();
  if (!raw) return 0;

  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return 0;

    // minimal valid row: ada salah satu field
    const rows = arr
      .map((x) => ({
        dayName: String(x?.dayName ?? "").trim(),
        hijriahDay: Number(x?.hijriahDay ?? x?.hijirahDay ?? 0),
        dateM: String(x?.dateM ?? "").trim(),
        imamName: String(x?.imamName ?? "").trim(),
      }))
      .filter((r) => r.dayName || r.imamName || r.dateM || r.hijriahDay);

    return rows.length;
  } catch {
    return 0;
  }
}

type ScheduleRow = {
  dayName: string; // "Rabu"
  hijriahDay: number; // 1..30
  dateM: string; // "2026-02-18" (ISO date)
  imamName: string; // "Ust. ..."
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
        hijriahDay: Number(x?.hijriahDay ?? 0),
        dateM: String(x?.dateM ?? "").trim(),
        imamName: String(x?.imamName ?? "").trim(),
      }))
      .filter((r) => r.dayName || r.imamName || r.dateM || r.hijriahDay);
  } catch {
    return [];
  }
}

function ScheduleMetaEditor({
  fields,
  setFields,
  disabled,
}: {
  fields: Record<string, string>;
  setFields: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  disabled: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-sm font-semibold text-zinc-900">
        Schedule Section
      </div>
      <div className="mt-1 text-xs text-zinc-500">
        Judul & caption untuk tampilan di frontpage.
      </div>

      <label className="mt-4 block text-sm font-medium text-zinc-800">
        Section Title
      </label>
      <input
        disabled={disabled}
        value={fields[SCHEDULE_TITLE_KEY] || ""}
        onChange={(e) =>
          setFields((prev) => ({
            ...prev,
            [SCHEDULE_TITLE_KEY]: e.target.value,
          }))
        }
        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
        placeholder="Schedule"
      />

      <label className="mt-3 block text-sm font-medium text-zinc-800">
        Section Caption
      </label>
      <input
        disabled={disabled}
        value={fields[SCHEDULE_CAPTION_KEY] || ""}
        onChange={(e) =>
          setFields((prev) => ({
            ...prev,
            [SCHEDULE_CAPTION_KEY]: e.target.value,
          }))
        }
        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
        placeholder="Contoh: Jadwal imam minggu ini"
      />
    </div>
  );
}

function ScheduleEditor({
  value,
  onChange,
  disabled,
}: {
  value: ScheduleRow[];
  onChange: (next: ScheduleRow[]) => void;
  disabled: boolean;
}) {
  function updateRow(i: number, patch: Partial<ScheduleRow>) {
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    onChange([
      ...value,
      { dayName: "", hijriahDay: 1, dateM: "", imamName: "" },
    ]);
  }

  function removeRow(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function sortRows() {
    const sorted = [...value].sort((a, b) => {
      // prefer hijriahDay kalau valid
      const ra = Number(a.hijriahDay || 0);
      const rb = Number(b.hijriahDay || 0);
      if (ra && rb && ra !== rb) return ra - rb;

      // fallback ke dateM
      if (a.dateM && b.dateM) return a.dateM.localeCompare(b.dateM);
      if (a.dateM) return -1;
      if (b.dateM) return 1;

      return 0;
    });
    onChange(sorted);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Jadwal</div>
          <div className="mt-1 text-xs text-zinc-500">
            Disimpan sebagai JSON di{" "}
            <span className="font-mono">{SCHEDULE_KEY}</span>.
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled || value.length <= 1}
            onClick={sortRows}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
          >
            Sort
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={addRow}
            className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            + Tambah Baris
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[820px] w-full border-collapse">
          <thead className="bg-zinc-50 text-xs text-zinc-600">
            <tr>
              <th className="p-2 text-left">Hari</th>
              <th className="p-2 text-left">hijriah (1447H)</th>
              <th className="p-2 text-left">Tanggal (2026M)</th>
              <th className="p-2 text-left">Imam</th>
              <th className="p-2"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-200 text-sm">
            {value.length === 0 ? (
              <tr>
                <td className="p-3 text-zinc-500" colSpan={5}>
                  Belum ada jadwal.
                </td>
              </tr>
            ) : (
              value.map((row, i) => (
                <tr key={i}>
                  <td className="p-2">
                    <input
                      disabled={disabled}
                      value={row.dayName}
                      onChange={(e) =>
                        updateRow(i, { dayName: e.target.value })
                      }
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400 disabled:opacity-60"
                      placeholder="Rabu"
                    />
                  </td>

                  <td className="p-2">
                    <input
                      disabled={disabled}
                      type="number"
                      min={1}
                      value={row.hijriahDay ?? 1}
                      onChange={(e) =>
                        updateRow(i, { hijriahDay: Number(e.target.value) })
                      }
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400 disabled:opacity-60"
                      placeholder="1"
                    />
                  </td>

                  <td className="p-2">
                    <input
                      disabled={disabled}
                      type="date"
                      value={row.dateM}
                      onChange={(e) => updateRow(i, { dateM: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400 disabled:opacity-60"
                    />
                  </td>

                  <td className="p-2">
                    <input
                      disabled={disabled}
                      value={row.imamName}
                      onChange={(e) =>
                        updateRow(i, { imamName: e.target.value })
                      }
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400 disabled:opacity-60"
                      placeholder="Ust. ..."
                    />
                  </td>

                  <td className="p-2 text-right">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => removeRow(i)}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE!;
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL!;

  // realtime socket (opsional untuk update list CMS juga)
  const socket: Socket = useMemo(
    () => io(socketUrl, { transports: ["websocket"] }),
    [socketUrl],
  );

  const [phase, setPhase] = useState<Phase>("idle");
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState("");

  const isBusy = phase !== "idle";
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

  const [showNotice, setShowNotice] = useState(false);

  function pushStatus(msg: string) {
    setErrorText("");
    setStatusText(msg);
    setShowNotice(true);
  }

  function pushError(msg: string) {
    setStatusText("");
    setErrorText(msg);
    setShowNotice(true);
  }

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
    pushStatus("Loading posts...");
    setPhase("loading_list");
    try {
      const res = await fetch(`${apiBase}/posts`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();
      setPosts(data);
      setStatusText("");
    } catch (e: any) {
      pushError(e?.message || "Failed to load posts");
    } finally {
      setPhase("idle");
    }
  }

  // initial load
  useEffect(() => {
    refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep CMS list in sync via socket (nice to have)
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
      // kalau yang sedang diedit dihapus, tutup drawer
      setEditing((curr) => (curr?.id === id ? null : curr));
    });

    return () => {
      socket.off("post:upsert");
      socket.off("post:delete");
      socket.disconnect();
    };
  }, [socket]);

  function computeMaxFilledBlock(fields?: Record<string, string>) {
    let max = 1;
    for (let i = 1; i <= 10; i++) {
      const t = (fields?.[`title_${i}`] || "").trim();
      const d = (fields?.[`description_${i}`] || "").trim();
      if (t || d) max = i;
    }
    return max;
  }

  // open edit drawer
  function openEdit(p: PostItem) {
    setErrorText("");
    setStatusText("");
    setEditing(p);
    setEditFields({ ...makeEmptyFields(), ...(p.fields || {}) });
    setEditVisibleBlocks(computeMaxFilledBlock(p.fields));
    setEditSchedule(parseSchedule(p.fields));
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
    setStatusText("");
    setErrorText("");
    setEditSchedule([]);
  }

  async function uploadMedia(
    kind: MediaType,
    images: FileList | null,
    video: File | null,
  ) {
    const isImages = kind === "images" || kind === "popup_images";
    const isVideo = kind === "video" || kind === "popup_video";

    // return { mediaType|null, mediaUrls, mediaPaths }
    if (isImages && images?.length) {
      const fd = new FormData();
      Array.from(images).forEach((f) => fd.append("files", f));
      const res = await fetch(`${apiBase}/upload/images`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(
          typeof err === "string"
            ? err
            : err?.message || "Upload images failed",
        );
      }
      const uploadRes = await safeJson(res);
      return {
        mediaType: kind as "images" | "popup_images",
        mediaUrls: uploadRes.mediaUrls ?? [],
        mediaPaths: uploadRes.mediaPaths ?? [],
      };
    }

    if (isVideo && video) {
      const fd = new FormData();
      fd.append("file", video);
      const res = await fetch(`${apiBase}/upload/video`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(
          typeof err === "string" ? err : err?.message || "Upload video failed",
        );
      }
      const uploadRes = await safeJson(res);
      return {
        mediaType: kind as "video" | "popup_video",
        mediaUrls: uploadRes.mediaUrls ?? [],
        mediaPaths: uploadRes.mediaPaths ?? [],
      };
    }

    return { mediaType: null, mediaUrls: [], mediaPaths: [] };
  }

  async function handleCreate() {
    if (isBusy) return;

    setErrorText("");
    setStatusText("");

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
          createMediaType,
          createImages,
          createVideo,
        );
        mediaType = up.mediaType;
        mediaUrls = up.mediaUrls;
        mediaPaths = up.mediaPaths;
      }

      setPhase("creating");
      setStatusText("Creating post & pushing realtime...");

      const payloadFields = { ...createFields };
      payloadFields[SCHEDULE_KEY] = createSchedule.length
        ? JSON.stringify(createSchedule)
        : "";

      const res = await fetch(`${apiBase}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: payloadFields,
          mediaType,
          mediaUrls,
          mediaPaths,
        }),
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(
          typeof err === "string" ? err : err?.message || "Create failed",
        );
      }

      pushStatus("Done.");
      setCreateFields(makeEmptyFields());
      setCreateImages(null);
      setCreateVideo(null);
      setCreateVisibleBlocks(1);
      setCreateSchedule([]);

      setTimeout(() => setStatusText(""), 700);
    } catch (e: any) {
      pushError(e?.message || "Create error");
    } finally {
      setPhase("idle");
    }
  }

  async function handleUpdate() {
    if (!editing || isBusy) return;

    setErrorText("");
    setStatusText("");

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
      payload.fields[SCHEDULE_KEY] = editSchedule.length
        ? JSON.stringify(editSchedule)
        : "";

      if (replaceMedia) {
        setPhase("uploading_update");
        setStatusText("Uploading replacement media...");

        const up = await uploadMedia(editMediaType, editImages, editVideo);
        payload.mediaType = up.mediaType;
        payload.mediaUrls = up.mediaUrls;
        payload.mediaPaths = up.mediaPaths;
      }

      setPhase("updating");
      setStatusText("Updating & pushing realtime...");

      const res = await fetch(`${apiBase}/posts/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(
          typeof err === "string" ? err : err?.message || "Update failed",
        );
      }

      const updated = await safeJson(res);
      setEditing(updated);

      setEditImages(null);
      setEditVideo(null);

      setStatusText("Updated.");
      setTimeout(() => setStatusText(""), 700);
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
      const res = await fetch(`${apiBase}/posts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await safeJson(res);
        throw new Error(
          typeof err === "string" ? err : err?.message || "Delete failed",
        );
      }
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

    const scheduleCount = getScheduleCount(p.fields || {});
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

    const scheduleCount = getScheduleCount(f);

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

  function TabButton({
    active,
    onClick,
    title,
    desc,
  }: {
    active: boolean;
    onClick: () => void;
    title: string;
    desc?: string;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={[
          "flex-1 rounded-2xl border px-4 py-3 text-left transition",
          active
            ? "border-zinc-900 bg-zinc-900 text-white"
            : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50",
        ].join(" ")}
      >
        <div className="text-sm font-semibold">{title}</div>
        {desc ? (
          <div
            className={[
              "mt-0.5 text-xs",
              active ? "text-white/80" : "text-zinc-500",
            ].join(" ")}
          >
            {desc}
          </div>
        ) : null}
      </button>
    );
  }

  function getOrderValue(fields?: Record<string, string>) {
    const raw = fields?.["display_order"];
    const n = raw !== undefined ? Number(raw) : NaN;
    // kosong/invalid => taruh paling bawah
    return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
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

  async function patchOrder(post: PostItem, newOrder: number) {
    const nextFields = {
      ...(post.fields || {}),
      display_order: String(newOrder),
    };

    const res = await fetch(`${apiBase}/posts/${post.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: nextFields }),
    });

    if (!res.ok) {
      const err = await safeJson(res);
      throw new Error(
        typeof err === "string" ? err : err?.message || "Update order failed",
      );
    }

    return await safeJson(res);
  }

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

      setStatusText("");
    } catch (e: any) {
      // kalau gagal, reload list biar konsisten
      pushError(e?.message || "Reorder error");
      await refreshList();
    } finally {
      setPhase("idle");
    }
  }

  useEffect(() => {
    if (!showNotice) return;
    if (!statusText) return; // hanya auto-hide untuk status sukses/progress

    const t = setTimeout(() => setShowNotice(false), 3000);
    return () => clearTimeout(t);
  }, [showNotice, statusText]);

  const isCreateImages =
    createMediaType === "images" || createMediaType === "popup_images";
  const isCreateVideo =
    createMediaType === "video" || createMediaType === "popup_video";

  const isEditImages =
    editMediaType === "images" || editMediaType === "popup_images";
  const isEditVideo =
    editMediaType === "video" || editMediaType === "popup_video";

  const busyLabel =
    phase === "loading_list"
      ? "Loading..."
      : phase === "uploading_create"
        ? "Uploading..."
        : phase === "creating"
          ? "Creating..."
          : phase === "uploading_update"
            ? "Uploading..."
            : phase === "updating"
              ? "Updating..."
              : phase === "deleting"
                ? "Deleting..."
                : phase === "reordering"
                  ? "Reordering..."
                  : "";

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

      {showNotice && (statusText || errorText) ? (
        <div className="fixed bottom-4 right-4 z-[9999] w-[min(420px,calc(100vw-2rem))]">
          <div
            className={[
              "rounded-2xl border p-4 shadow-lg backdrop-blur bg-white/95",
              errorText ? "border-rose-200" : "border-zinc-200",
            ].join(" ")}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              {isBusy ? <Spinner className="mt-0.5" /> : null}

              <div className="min-w-0 flex-1 space-y-1">
                {errorText ? (
                  <div className="text-sm font-semibold text-rose-800">
                    {errorText}
                  </div>
                ) : null}

                {statusText ? (
                  <div className="text-sm text-zinc-800">
                    {statusText} {busyLabel ? `(${busyLabel})` : ""}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowNotice(false);
                }}
                className="shrink-0 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                {fieldPairs.slice(0, createVisibleBlocks).map((n) => (
                  <div
                    key={n}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div className="text-xs font-medium text-zinc-500">
                      Block {n}
                    </div>

                    <label className="mt-3 block text-sm font-medium text-zinc-800">
                      Title {n}
                    </label>
                    <input
                      value={createFields[`title_${n}`] || ""}
                      disabled={isBusy}
                      onChange={(e) =>
                        setCreateFields((prev) => ({
                          ...prev,
                          [`title_${n}`]: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
                    />

                    <label className="mt-3 block text-sm font-medium text-zinc-800">
                      Description {n}
                    </label>
                    <RichTextEditor
                      value={createFields[`description_${n}`] || ""}
                      disabled={isBusy}
                      onChange={(html) =>
                        setCreateFields((prev) => ({
                          ...prev,
                          [`description_${n}`]: html,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isBusy || createVisibleBlocks >= 10}
                  onClick={() =>
                    setCreateVisibleBlocks((v) => Math.min(10, v + 1))
                  }
                  className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  + Add Block
                </button>

                <button
                  type="button"
                  disabled={isBusy || createVisibleBlocks <= 1}
                  onClick={() => {
                    const next = Math.max(1, createVisibleBlocks - 1);
                    const removedIndex = createVisibleBlocks;
                    setCreateFields((prev) => ({
                      ...prev,
                      [`title_${removedIndex}`]: "",
                      [`description_${removedIndex}`]: "",
                    }));
                    setCreateVisibleBlocks(next);
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Remove Last Block
                </button>

                <div className="self-center text-xs text-zinc-500">
                  Showing {createVisibleBlocks}/10
                </div>
              </div>
            </div>
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
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="text-sm font-semibold text-zinc-900">
                Media (optional)
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                Images slider / Video autoplay / Pop-up images / Pop-up video.
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-zinc-800">
                    Media Type
                  </label>
                  <select
                    value={createMediaType}
                    onChange={(e) =>
                      setCreateMediaType(e.target.value as MediaType)
                    }
                    disabled={isBusy}
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
                  >
                    <option value="images">Images (Slider)</option>
                    <option value="video">Video (Autoplay)</option>
                    <option value="popup_images">
                      Pop-up Images (Fullscreen Slider)
                    </option>
                    <option value="popup_video">
                      Pop-up Video (Fullscreen)
                    </option>
                  </select>
                </div>

                {isCreateImages ? (
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-zinc-800">
                      Upload Images
                    </label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      multiple
                      disabled={isBusy}
                      onChange={(e) => {
                        setCreateImages(e.target.files);
                        setCreateVideo(null);
                      }}
                      className="text-sm text-zinc-700 disabled:opacity-60"
                    />
                  </div>
                ) : isCreateVideo ? (
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-zinc-800">
                      Upload Video (MP4)
                    </label>
                    <input
                      type="file"
                      accept="video/mp4"
                      disabled={isBusy}
                      onChange={(e) => {
                        setCreateVideo(e.target.files?.[0] ?? null);
                        setCreateImages(null);
                      }}
                      className="text-sm text-zinc-700 disabled:opacity-60"
                    />
                  </div>
                ) : null}
              </div>
            </div>
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
            <div className="rounded-2xl border border-zinc-200 bg-white p-4">
              <div className="text-sm font-semibold text-zinc-900">Layout</div>
              <div className="mt-1 text-xs text-zinc-500">
                Pengaturan global untuk card ini.
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-zinc-800">
                    Display Order
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    disabled={isBusy}
                    value={createFields["display_order"] || ""}
                    onChange={(e) =>
                      setCreateFields((prev) => ({
                        ...prev,
                        display_order: e.target.value,
                      }))
                    }
                    className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
                    placeholder="mis. 1000"
                  />
                  <div className="text-xs text-zinc-500">
                    Semakin kecil semakin atas.
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <label className="flex items-center gap-2 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={createFields["layout_full_span"] === "true"}
                      onChange={(e) =>
                        setCreateFields((prev) => ({
                          ...prev,
                          layout_full_span: String(e.target.checked),
                        }))
                      }
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    Full width card (span 2 columns)
                  </label>
                </div>
              </div>
            </div>
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
                <div className="grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    {fieldPairs.slice(0, editVisibleBlocks).map((n) => (
                      <div
                        key={n}
                        className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                      >
                        <div className="text-xs font-medium text-zinc-500">
                          Block {n}
                        </div>

                        <label className="mt-3 block text-sm font-medium text-zinc-800">
                          Title {n}
                        </label>
                        <input
                          value={editFields[`title_${n}`] || ""}
                          disabled={isBusy}
                          onChange={(e) =>
                            setEditFields((prev) => ({
                              ...prev,
                              [`title_${n}`]: e.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
                        />

                        <label className="mt-3 block text-sm font-medium text-zinc-800">
                          Description {n}
                        </label>
                        <RichTextEditor
                          value={editFields[`description_${n}`] || ""}
                          disabled={isBusy}
                          onChange={(html) =>
                            setEditFields((prev) => ({
                              ...prev,
                              [`description_${n}`]: html,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isBusy || editVisibleBlocks >= 10}
                      onClick={() =>
                        setEditVisibleBlocks((v) => Math.min(10, v + 1))
                      }
                      className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                    >
                      + Add Block
                    </button>

                    <button
                      type="button"
                      disabled={isBusy || editVisibleBlocks <= 1}
                      onClick={() => {
                        const next = Math.max(1, editVisibleBlocks - 1);
                        const removedIndex = editVisibleBlocks;
                        setEditFields((prev) => ({
                          ...prev,
                          [`title_${removedIndex}`]: "",
                          [`description_${removedIndex}`]: "",
                        }));
                        setEditVisibleBlocks(next);
                      }}
                      className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      Remove Last Block
                    </button>

                    <div className="self-center text-xs text-zinc-500">
                      Showing {editVisibleBlocks}/10
                    </div>
                  </div>
                </div>
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
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="text-sm font-semibold text-zinc-900">
                    Media
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Upload media baru kalau ingin mengganti yang lama.
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-zinc-800">
                        Media Type
                      </label>
                      <select
                        value={editMediaType}
                        onChange={(e) =>
                          setEditMediaType(e.target.value as MediaType)
                        }
                        disabled={isBusy}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
                      >
                        <option value="images">Images (Slider)</option>
                        <option value="video">Video (Autoplay)</option>
                        <option value="popup_images">Pop-up Images</option>
                        <option value="popup_video">Pop-up Video</option>
                      </select>
                    </div>

                    {/* Existing media info */}
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <div className="text-sm font-medium text-zinc-800">
                        Current Media
                      </div>
                      <div className="mt-1 text-xs text-zinc-500 break-all">
                        {(editing.media_urls?.length ?? 0) > 0
                          ? editing.media_urls?.join("\n")
                          : "No media attached."}
                      </div>
                    </div>

                    {isEditImages ? (
                      <div className="grid gap-2">
                        <label className="text-sm font-medium text-zinc-800">
                          Upload Images (replace)
                        </label>
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          multiple
                          disabled={isBusy}
                          onChange={(e) => {
                            setEditImages(e.target.files);
                            setEditVideo(null);
                          }}
                          className="text-sm text-zinc-700 disabled:opacity-60"
                        />
                      </div>
                    ) : null}

                    {isEditVideo ? (
                      <div className="grid gap-2">
                        <label className="text-sm font-medium text-zinc-800">
                          Upload Video (replace)
                        </label>
                        <input
                          type="file"
                          accept="video/mp4"
                          disabled={isBusy}
                          onChange={(e) => {
                            setEditVideo(e.target.files?.[0] ?? null);
                            setEditImages(null);
                          }}
                          className="text-sm text-zinc-700 disabled:opacity-60"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
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
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="text-sm font-semibold text-zinc-900">
                    Layout
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-zinc-800">
                        Display Order
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        disabled={isBusy}
                        value={editFields["display_order"] || ""}
                        onChange={(e) =>
                          setEditFields((prev) => ({
                            ...prev,
                            display_order: e.target.value,
                          }))
                        }
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
                      />
                      <div className="text-xs text-zinc-500">
                        Semakin kecil semakin atas.
                      </div>
                    </div>

                    <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={editFields["layout_full_span"] === "true"}
                        disabled={isBusy}
                        onChange={(e) =>
                          setEditFields((prev) => ({
                            ...prev,
                            layout_full_span: String(e.target.checked),
                          }))
                        }
                        className="h-4 w-4 rounded border-zinc-300"
                      />
                      Full width card (span 2 columns)
                    </label>
                  </div>
                </div>
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
