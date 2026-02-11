export function formatIDR(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

// dari string input "Rp 1.234.000" -> 1234000
export function parseIDR(input: string) {
  const digits = (input || "").replace(/[^\d]/g, "");
  if (!digits) return 0;
  // aman untuk nominal <= miliaran; kalau besar banget pertimbangkan BigInt
  return Number(digits);
}
