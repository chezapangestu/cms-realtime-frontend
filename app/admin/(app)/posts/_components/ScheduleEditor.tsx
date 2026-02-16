"use client";

import * as React from "react";

import {
  SCHEDULE_KEY,
  SCHEDULE_TITLE_KEY,
  SCHEDULE_CAPTION_KEY,
  type ScheduleRow,
} from "../_lib/schedule";

export function ScheduleMetaEditor({
  fields,
  setFields,
  disabled,
}: {
  fields: Record<string, string>;
  setFields: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  disabled: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-sm font-semibold text-zinc-900">
        Schedule Section
      </div>
      <div className="mt-1 text-xs text-zinc-500">
        Judul & caption untuk tampilan di frontpage.
      </div>

      <label className="mt-4 block text-sm font-medium text-zinc-800">
        Section Title
      </label>
      <input
        disabled={disabled}
        value={fields[SCHEDULE_TITLE_KEY] || ""}
        onChange={(e) =>
          setFields((prev) => ({
            ...prev,
            [SCHEDULE_TITLE_KEY]: e.target.value,
          }))
        }
        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
        placeholder="Schedule"
      />

      <label className="mt-3 block text-sm font-medium text-zinc-800">
        Section Caption
      </label>
      <input
        disabled={disabled}
        value={fields[SCHEDULE_CAPTION_KEY] || ""}
        onChange={(e) =>
          setFields((prev) => ({
            ...prev,
            [SCHEDULE_CAPTION_KEY]: e.target.value,
          }))
        }
        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
        placeholder="Contoh: Jadwal imam minggu ini"
      />
    </div>
  );
}

export function ScheduleEditor({
  value,
  onChange,
  disabled,
}: {
  value: ScheduleRow[];
  onChange: (next: ScheduleRow[]) => void;
  disabled: boolean;
}) {
  function updateRow(i: number, patch: Partial<ScheduleRow>) {
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    onChange([
      ...value,
      { dayName: "", hijriahDay: 1, dateM: "", imamName: "" },
    ]);
  }

  function removeRow(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function sortRows() {
    const sorted = [...value].sort((a, b) => {
      const ra = Number(a.hijriahDay || 0);
      const rb = Number(b.hijriahDay || 0);
      if (ra && rb && ra !== rb) return ra - rb;

      if (a.dateM && b.dateM) return a.dateM.localeCompare(b.dateM);
      if (a.dateM) return -1;
      if (b.dateM) return 1;

      return 0;
    });
    onChange(sorted);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Jadwal</div>
          <div className="mt-1 text-xs text-zinc-500">
            Disimpan sebagai JSON di{" "}
            <span className="font-mono">{SCHEDULE_KEY}</span>.
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={disabled || value.length <= 1}
            onClick={sortRows}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
          >
            Sort
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={addRow}
            className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            + Tambah Baris
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[820px] w-full border-collapse">
          <thead className="bg-zinc-50 text-xs text-zinc-600">
            <tr>
              <th className="p-2 text-left">Hari</th>
              <th className="p-2 text-left">Hijriah (1447H)</th>
              <th className="p-2 text-left">Tanggal (2026M)</th>
              <th className="p-2 text-left">Imam</th>
              <th className="p-2"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-200 text-sm">
            {value.length === 0 ? (
              <tr>
                <td className="p-3 text-zinc-500" colSpan={5}>
                  Belum ada jadwal.
                </td>
              </tr>
            ) : (
              value.map((row, i) => (
                <tr key={i}>
                  <td className="p-2">
                    <input
                      disabled={disabled}
                      value={row.dayName}
                      onChange={(e) =>
                        updateRow(i, { dayName: e.target.value })
                      }
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400 disabled:opacity-60"
                      placeholder="Rabu"
                    />
                  </td>

                  <td className="p-2">
                    <input
                      disabled={disabled}
                      type="number"
                      min={1}
                      value={row.hijriahDay ?? 1}
                      onChange={(e) =>
                        updateRow(i, { hijriahDay: Number(e.target.value) })
                      }
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400 disabled:opacity-60"
                      placeholder="1"
                    />
                  </td>

                  <td className="p-2">
                    <input
                      disabled={disabled}
                      type="date"
                      value={row.dateM}
                      onChange={(e) => updateRow(i, { dateM: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400 disabled:opacity-60"
                    />
                  </td>

                  <td className="p-2">
                    <input
                      disabled={disabled}
                      value={row.imamName}
                      onChange={(e) =>
                        updateRow(i, { imamName: e.target.value })
                      }
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none focus:border-zinc-400 disabled:opacity-60"
                      placeholder="Ust. ..."
                    />
                  </td>

                  <td className="p-2 text-right">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => removeRow(i)}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
