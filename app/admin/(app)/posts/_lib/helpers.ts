export function cleanStr(v: unknown) {
  return String(v ?? "").trim();
}

export function makeEmptyFields() {
  const init: Record<string, string> = {};
  for (let i = 1; i <= 10; i++) {
    init[`title_${i}`] = "";
    init[`description_${i}`] = "";
  }
  return init;
}

export function getOrderValue(fields?: Record<string, string>) {
  const raw = fields?.["display_order"];
  const n = raw !== undefined ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

export function computeMaxFilledBlock(fields?: Record<string, string>) {
  let max = 1;
  for (let i = 1; i <= 10; i++) {
    const t = (fields?.[`title_${i}`] || "").trim();
    const d = (fields?.[`description_${i}`] || "").trim();
    if (t || d) max = i;
  }
  return max;
}
