export type CmsSettings = {
  ticker_text: string;
  slide_duration_ms: number; // untuk perpindahan tipe slide (post/schedule/media/donation)
  media_interval_ms: number; // khusus media slider (image/video)
};

type SettingsRow = { id: string; fields: Record<string, any> };

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
  if (!res.ok) throw new Error("Failed to save settings");
  const json = await res.json();
  return normalizeSettingsFromSocket(json);
}
