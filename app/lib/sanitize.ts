"use client";

import DOMPurify from "dompurify";

export function sanitizeHtml(html: string) {
  // aman untuk client-side render
  return DOMPurify.sanitize(html || "", {
    USE_PROFILES: { html: true },
  });
}
