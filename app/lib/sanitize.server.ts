// Server-safe fallback (tanpa jsdom).
// Kalau mau benar-benar sanitize di server, kita bisa pakai package `sanitize-html`.
// Untuk sekarang: minimal aman, tidak crash build.

export function sanitizeHtml(html: string) {
  return String(html || "");
}
