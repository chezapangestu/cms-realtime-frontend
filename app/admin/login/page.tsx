export const dynamic = "force-dynamic";
export const revalidate = 0;

("use client");

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AdminLoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextPath = sp.get("next") || "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Login failed");

      router.replace(nextPath);
    } catch (e: any) {
      setErr(e?.message || "Login error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-lg font-semibold text-zinc-900">Admin Login</div>
        <div className="mt-1 text-sm text-zinc-500">
          Masuk untuk mengakses CMS.
        </div>

        {err ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {err}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-800">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
              placeholder="input your username..."
              autoComplete="username"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-zinc-800">
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            disabled={loading}
            className="mt-1 inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Login"}
          </button>

          <a
            href="/"
            className="text-center text-sm text-zinc-600 hover:text-zinc-900"
          >
            Kembali ke Frontpage
          </a>
        </form>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginInner />
    </Suspense>
  );
}
