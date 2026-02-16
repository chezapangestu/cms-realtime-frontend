export type CmsSettings = {
  ticker_text: string;
  slide_duration_ms: number;
};

// (optional) kalau mau tetap pakai tipe ini
export type SettingsRow = { id: string; fields: Record<string, any> };

function clampSlideDuration(input: any) {
  const n = Number(input);
  if (!Number.isFinite(n)) return 8000;
  return Math.max(500, n);
}

/**
 * Bisa dipakai untuk:
 * - response GET/PUT: { id, fields: {...} }
 * - payload socket:  { id, fields } atau object flat {...}
 */
export function normalizeSettingsFromSocket(input: any): CmsSettings {
  const fields =
    input?.fields && typeof input.fields === "object" ? input.fields : input;

  return {
    ticker_text: String(fields?.ticker_text ?? ""),
    slide_duration_ms: clampSlideDuration(fields?.slide_duration_ms ?? 8000),
  };
}

export async function fetchSettings(apiBase: string): Promise<CmsSettings> {
  const res = await fetch(`${apiBase}/settings?id=app`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load settings");
  const json = await res.json();
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
