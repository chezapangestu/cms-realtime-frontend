"use client";

import { Card } from "../../../components/Card";
import { useNotice, type Phase } from "../posts/_lib/useNotice";
import { NoticeToast } from "../posts/_components/NoticeToast";
import { SettingsEditor } from "./_components/SettingsEditor";
import { useState } from "react";

export default function AdminSettingsPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE!;
  const [phase] = useState<Phase>("idle");

  const {
    showNotice,
    statusText,
    errorText,
    isBusy,
    busyLabel,
    pushStatus,
    pushError,
    closeNotice,
  } = useNotice(phase);

  return (
    <main className="space-y-6">
      <NoticeToast
        open={showNotice}
        statusText={statusText}
        errorText={errorText}
        isBusy={isBusy}
        busyLabel={busyLabel}
        onClose={closeNotice}
      />

      <Card>
        <div className="text-sm font-semibold text-zinc-900">
          Admin Settings
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          Running text landing, background image, dan durasi slider.
        </div>

        <div className="mt-4">
          <SettingsEditor
            apiBase={apiBase}
            disabled={isBusy}
            pushStatus={pushStatus}
            pushError={pushError}
          />
        </div>
      </Card>
    </main>
  );
}
