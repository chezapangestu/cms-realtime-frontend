export type CmsSettings = {
  ticker_text: string;
  slide_duration_ms: number; // untuk perpindahan tipe slide (post/schedule/media/donation)
  media_interval_ms: number; // khusus media slider (image/video)
  landing_background_url?: string;
};

type SettingsRow = { id: string; fields: Record<string, any> };

export type UploadLandingBackgroundResponse = {
  url: string;
  path?: string;
};

export function normalizeSettingsFromSocket(input: any): CmsSettings {
  const fields =
    input?.fields && typeof input.fields === "object" ? input.fields : input;

  return {
    ticker_text: String(fields?.ticker_text || ""),
    slide_duration_ms: Math.max(500, Number(fields?.slide_duration_ms || 8000)),
    media_interval_ms: Math.max(
      500,
      Number(fields?.media_interval_ms || 15000),
    ),
    landing_background_url: String(fields?.landing_background_url || ""),
  };
}

export async function fetchSettings(apiBase: string): Promise<CmsSettings> {
  const res = await fetch(`${apiBase}/settings?id=app`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load settings");
  const json = (await res.json()) as SettingsRow;
  return normalizeSettingsFromSocket(json);
}

export async function updateSettings(
  apiBase: string,
  payload: CmsSettings,
): Promise<CmsSettings> {
  const res = await fetch(`${apiBase}/settings?id=app`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = "Failed to save settings";
    try {
      const err = await res.json();
      message = err?.message || message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  const json = await res.json();
  return normalizeSettingsFromSocket(json);
}

/**
 * Upload background image untuk landing page.
 * Backend endpoint yang diharapkan: POST /settings/upload-background
 * multipart/form-data dengan field "file"
 */
export async function uploadLandingBackground(
  apiBase: string,
  file: File,
): Promise<UploadLandingBackgroundResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${apiBase}/settings/upload-background`, {
    method: "POST",
    body: form,
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // response bukan json
  }

  if (!res.ok) {
    throw new Error(json?.message || "Failed to upload background");
  }

  return {
    url: String(json?.url || ""),
    path: json?.path ? String(json.path) : undefined,
  };
}
