"use client";

import { useState } from "react";
import { Card } from "@/app/components/Card";
import { useNotice } from "../_lib/useNotice";
import type { Phase } from "../_lib/types";

type Props = {
  apiBase: string;
  editingId?: string | null;
  initialData?: any;
  onCreated?: () => void;
  onUpdated?: () => void;
};

export function PostForm({
  apiBase,
  editingId,
  initialData,
  onCreated,
  onUpdated,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");

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

  // contoh field dulu
  const [title1, setTitle1] = useState(initialData?.fields?.title_1 ?? "");

  async function handleSubmit() {
    try {
      setPhase(editingId ? "updating" : "creating");

      pushStatus("Saving post...");

      const payload = {
        fields: {
          title_1: title1,
        },
      };

      const res = await fetch(
        editingId ? `${apiBase}/posts/${editingId}` : `${apiBase}/posts`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error("Failed to save");

      pushStatus("Saved.");

      if (editingId) onUpdated?.();
      else onCreated?.();
    } catch (e: any) {
      pushError(e.message);
    } finally {
      setPhase("idle");
    }
  }

  return (
    <Card>
      <div className="space-y-4">
        <input
          value={title1}
          onChange={(e) => setTitle1(e.target.value)}
          className="w-full rounded-xl border px-3 py-2"
          placeholder="Title 1"
        />

        <button
          onClick={handleSubmit}
          disabled={isBusy}
          className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {busyLabel || "Save"}
        </button>
      </div>
    </Card>
  );
}
