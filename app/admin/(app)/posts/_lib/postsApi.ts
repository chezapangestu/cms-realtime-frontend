// app/admin/(app)/posts/_lib/postsApi.ts

export type MediaType = "images" | "video" | "popup_images" | "popup_video";

export type PostItem = {
  id: string;
  fields?: Record<string, string>;
  media_type?: MediaType | null;
  media_urls?: string[] | null;
  media_paths?: string[] | null;
  created_at: string;
  updated_at: string;
};

export async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function fetchPosts(apiBase: string): Promise<PostItem[]> {
  const res = await fetch(`${apiBase}/posts`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch posts");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function createPost(
  apiBase: string,
  payload: {
    fields: Record<string, string>;
    mediaType: MediaType | null;
    mediaUrls: string[];
    mediaPaths: string[];
  },
): Promise<PostItem> {
  const res = await fetch(`${apiBase}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(
      typeof err === "string" ? err : err?.message || "Create failed",
    );
  }

  return (await safeJson(res)) as PostItem;
}

export async function updatePost(
  apiBase: string,
  id: string,
  payload: {
    fields: Record<string, string>;
    mediaType?: MediaType | null;
    mediaUrls?: string[];
    mediaPaths?: string[];
  },
): Promise<PostItem> {
  const res = await fetch(`${apiBase}/posts/${id}`, {
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

  return (await safeJson(res)) as PostItem;
}

export async function deletePost(apiBase: string, id: string): Promise<void> {
  const res = await fetch(`${apiBase}/posts/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(
      typeof err === "string" ? err : err?.message || "Delete failed",
    );
  }
}

export async function patchPostFields(
  apiBase: string,
  id: string,
  fields: Record<string, string>,
): Promise<PostItem> {
  return await updatePost(apiBase, id, { fields });
}

// ---------- Upload helpers ----------

export async function uploadImages(
  apiBase: string,
  files: FileList,
): Promise<{ mediaUrls: string[]; mediaPaths: string[] }> {
  const fd = new FormData();
  Array.from(files).forEach((f) => fd.append("files", f));

  const res = await fetch(`${apiBase}/upload/images`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(
      typeof err === "string" ? err : err?.message || "Upload images failed",
    );
  }

  const uploadRes = await safeJson(res);
  return {
    mediaUrls: uploadRes.mediaUrls ?? [],
    mediaPaths: uploadRes.mediaPaths ?? [],
  };
}

export async function uploadVideo(
  apiBase: string,
  file: File,
): Promise<{ mediaUrls: string[]; mediaPaths: string[] }> {
  const fd = new FormData();
  fd.append("file", file);

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
    mediaUrls: uploadRes.mediaUrls ?? [],
    mediaPaths: uploadRes.mediaPaths ?? [],
  };
}

export async function uploadMedia(
  apiBase: string,
  kind: MediaType,
  images: FileList | null,
  video: File | null,
): Promise<{
  mediaType: MediaType | null;
  mediaUrls: string[];
  mediaPaths: string[];
}> {
  const isImages = kind === "images" || kind === "popup_images";
  const isVideo = kind === "video" || kind === "popup_video";

  if (isImages && images?.length) {
    const up = await uploadImages(apiBase, images);
    return { mediaType: kind, ...up };
  }

  if (isVideo && video) {
    const up = await uploadVideo(apiBase, video);
    return { mediaType: kind, ...up };
  }

  return { mediaType: null, mediaUrls: [], mediaPaths: [] };
}
