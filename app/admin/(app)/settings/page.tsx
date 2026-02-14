"use client";

import { Card } from "../../../components/Card";

export default function AdminSettingsPage() {
  return (
    <main className="space-y-4">
      <Card>
        <div className="text-sm font-semibold text-zinc-900">Settings</div>
        <div className="mt-2 text-sm text-zinc-600">
          Halaman ini bisa dipakai untuk konfigurasi global (misalnya: socket
          URL, API base, default popup config, dll).
        </div>
      </Card>
    </main>
  );
}
