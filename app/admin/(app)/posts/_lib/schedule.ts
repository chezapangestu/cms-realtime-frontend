// app/admin/(app)/posts/_lib/schedule.ts

export const SCHEDULE_KEY = "schedule_json";
export const SCHEDULE_TITLE_KEY = "schedule_section_title";
export const SCHEDULE_CAPTION_KEY = "schedule_section_caption";

export type ScheduleRow = {
  dayName: string; // "Rabu"
  // hijriahDay: number; // 1..30
  hijriahDay: string; // 1 Muharram
  dateM: string; // "YYYY-MM-DD"
  imamName: string; // "Ust. ..."
};

function normalizeRow(x: any): ScheduleRow {
  return {
    dayName: String(x?.dayName ?? "").trim(),
    // fallback typo lama: hijirahDay
    hijriahDay: String(x?.hijriahDay ?? x?.hijirahDay ?? "").trim(),
    dateM: String(x?.dateM ?? "").trim(),
    imamName: String(x?.imamName ?? "").trim(),
  };
}

function isValidRow(r: ScheduleRow) {
  return Boolean(r.dayName || r.imamName || r.dateM || r.hijriahDay);
}

/**
 * Parse schedule dari fields[SCHEDULE_KEY]
 */
export function parseScheduleFromFields(
  fields?: Record<string, string>,
): ScheduleRow[] {
  const raw = (fields?.[SCHEDULE_KEY] || "").trim();
  if (!raw) return [];

  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];

    return arr.map(normalizeRow).filter(isValidRow);
  } catch {
    return [];
  }
}

/**
 * Count schedule rows valid di fields[SCHEDULE_KEY]
 */
export function getScheduleCountFromFields(
  fields?: Record<string, string>,
): number {
  return parseScheduleFromFields(fields).length;
}

/**
 * Stringify schedule rows untuk disimpan ke fields[SCHEDULE_KEY]
 * - kalau empty => ""
 */
export function toScheduleJson(rows: ScheduleRow[]): string {
  if (!rows || rows.length === 0) return "";
  return JSON.stringify(rows);
}
