"use client";

import type { MediaType } from "../_lib/postsApi";

export function PostMediaEditor({
  mode,
  mediaType,
  setMediaType,
  disabled,
  existingMediaUrls,
  onPickImages,
  onPickVideo,
}: {
  mode: "create" | "edit";
  mediaType: MediaType;
  setMediaType: (v: MediaType) => void;
  disabled: boolean;
  existingMediaUrls?: string[] | null; // hanya untuk edit
  onPickImages: (files: FileList | null) => void;
  onPickVideo: (file: File | null) => void;
}) {
  const isImages = mediaType === "images" || mediaType === "popup_images";
  const isVideo = mediaType === "video" || mediaType === "popup_video";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-sm font-semibold text-zinc-900">
        Media {mode === "create" ? "(optional)" : ""}
      </div>
      <div className="mt-1 text-xs text-zinc-500">
        {mode === "create"
          ? "Images slider / Video autoplay / Pop-up images / Pop-up video."
          : "Upload media baru kalau ingin mengganti yang lama."}
      </div>

      <div className="mt-4 grid gap-3">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-zinc-800">
            Media Type
          </label>
          <select
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value as MediaType)}
            disabled={disabled}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
          >
            <option value="images">Images (Slider)</option>
            <option value="video">Video (Autoplay)</option>
            <option value="popup_images">
              Pop-up Images (Fullscreen Slider)
            </option>
            <option value="popup_video">Pop-up Video (Fullscreen)</option>
          </select>
        </div>

        {mode === "edit" ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-sm font-medium text-zinc-800">
              Current Media
            </div>
            <div className="mt-1 whitespace-pre-wrap text-xs text-zinc-500 break-all">
              {(existingMediaUrls?.length ?? 0) > 0
                ? existingMediaUrls?.join("\n")
                : "No media attached."}
            </div>
          </div>
        ) : null}

        {isImages ? (
          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-800">
              {mode === "create" ? "Upload Images" : "Upload Images (replace)"}
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg"
              multiple
              disabled={disabled}
              onChange={(e) => {
                onPickImages(e.target.files);
                onPickVideo(null);
              }}
              className="text-sm text-zinc-700 disabled:opacity-60"
            />
          </div>
        ) : null}

        {isVideo ? (
          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-800">
              {mode === "create"
                ? "Upload Video (MP4)"
                : "Upload Video (replace)"}
            </label>
            <input
              type="file"
              accept="video/mp4"
              disabled={disabled}
              onChange={(e) => {
                onPickVideo(e.target.files?.[0] ?? null);
                onPickImages(null);
              }}
              className="text-sm text-zinc-700 disabled:opacity-60"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
