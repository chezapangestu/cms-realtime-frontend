"use client";

import Link from "next/link";

export default function Home() {
  return (
    // <main className="min-h-screen bg-[#4682B4] text-white flex items-center justify-center p-6">
    <main className="min-h-screen bg-[#0047AB] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-3xl border border-white/20 bg-white/10 backdrop-blur p-6 shadow-xl">
        <div className="text-2xl font-semibold tracking-tight">
          Pilih Halaman
        </div>
        <div className="mt-2 text-sm text-white/80">
          Silakan pilih tampilan yang ingin dibuka.
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/landing"
            className="rounded-2xl bg-white text-[#1D3E53] px-4 py-4 font-semibold text-center hover:bg-white/90 transition"
          >
            Landing Page
            <div className="mt-1 text-xs font-medium opacity-70">
              Topbar + List + Waktu Sholat
            </div>
          </Link>

          <Link
            href="/smartboard"
            className="rounded-2xl border border-white/30 bg-white/10 px-4 py-4 font-semibold text-center hover:bg-white/15 transition"
          >
            Smartboard
            <div className="mt-1 text-xs font-medium text-white/80">
              Halaman CMS board (existing)
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
