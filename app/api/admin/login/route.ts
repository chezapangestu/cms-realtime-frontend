import { NextResponse } from "next/server";
import {
  createPayload,
  encodeTokenString,
  signPayload,
} from "@/app/lib/admin-session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = String(body?.username ?? "");
  const password = String(body?.password ?? "");

  if (username !== "admin" || password !== "amalsoleh22") {
    return NextResponse.json(
      { message: "Username atau password salah." },
      { status: 401 },
    );
  }

  const secret = process.env.ADMIN_AUTH_SECRET;
  if (!secret || secret.length < 16) {
    return NextResponse.json(
      { message: "Server misconfigured: ADMIN_AUTH_SECRET missing." },
      { status: 500 },
    );
  }

  // 1 hari
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24;

  const payload = createPayload(exp);
  const sig = await signPayload(payload, secret);
  const token = encodeTokenString(payload, sig);

  const res = NextResponse.json({ ok: true });

  res.cookies.set("admin_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 hari
  });

  return res;
}
