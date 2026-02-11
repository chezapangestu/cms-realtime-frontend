// app/lib/admin-session.ts
const encoder = new TextEncoder();

function base64urlEncode(input: Uint8Array) {
  let str = "";
  for (const b of input) str += String.fromCharCode(b);
  const b64 = btoa(str);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlDecodeToBytes(b64url: string) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function createPayload(expEpochSec: number) {
  const sidBytes = crypto.getRandomValues(new Uint8Array(16)); // 128-bit random
  const sid = base64urlEncode(sidBytes);
  return JSON.stringify({ sid, exp: expEpochSec });
}

export async function signPayload(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(payload)),
  );
  return base64urlEncode(sig);
}

export async function verifyToken(token: string, secret: string) {
  // token format: base64url(payload).base64url(sig)
  const [pB64, sigB64] = token.split(".");
  if (!pB64 || !sigB64) return { ok: false as const, reason: "bad_format" };

  const payloadBytes = base64urlDecodeToBytes(pB64);
  const payload = new TextDecoder().decode(payloadBytes);

  // recompute signature
  const expectedSig = await signPayload(payload, secret);

  // constant-ish time compare
  if (expectedSig.length !== sigB64.length)
    return { ok: false as const, reason: "bad_sig" };
  let diff = 0;
  for (let i = 0; i < expectedSig.length; i++)
    diff |= expectedSig.charCodeAt(i) ^ sigB64.charCodeAt(i);
  if (diff !== 0) return { ok: false as const, reason: "bad_sig" };

  // check exp
  let obj: any;
  try {
    obj = JSON.parse(payload);
  } catch {
    return { ok: false as const, reason: "bad_payload" };
  }

  const exp = Number(obj?.exp);
  if (!Number.isFinite(exp)) return { ok: false as const, reason: "bad_exp" };

  const now = Math.floor(Date.now() / 1000);
  if (now > exp) return { ok: false as const, reason: "expired" };

  return { ok: true as const };
}

export function encodeTokenString(payload: string, sig: string) {
  const pB64 = base64urlEncode(encoder.encode(payload));
  return `${pB64}.${sig}`;
}
