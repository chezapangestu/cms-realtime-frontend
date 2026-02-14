import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // redirect target
  const url = new URL("/admin/login", req.url);

  // response redirect
  const res = NextResponse.redirect(url, { status: 303 });

  // hapus cookie session
  res.cookies.set("admin_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return res;
}
