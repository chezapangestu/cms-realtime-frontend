"use client";

type Fields = Record<string, string>;

export function PostLayoutEditor({
  fields,
  setFields,
  disabled,
}: {
  fields: Fields;
  setFields: React.Dispatch<React.SetStateAction<Fields>>;
  disabled: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-sm font-semibold text-zinc-900">Layout</div>
      <div className="mt-1 text-xs text-zinc-500">
        Pengaturan global untuk card ini.
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-zinc-800">
            Display Order
          </label>
          <input
            type="number"
            inputMode="numeric"
            disabled={disabled}
            value={fields["display_order"] || ""}
            onChange={(e) =>
              setFields((prev) => ({
                ...prev,
                display_order: e.target.value,
              }))
            }
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
            placeholder="mis. 1000"
          />
          <div className="text-xs text-zinc-500">
            Semakin kecil semakin atas.
          </div>
        </div>

        <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={fields["layout_full_span"] === "true"}
            disabled={disabled}
            onChange={(e) =>
              setFields((prev) => ({
                ...prev,
                layout_full_span: String(e.target.checked),
              }))
            }
            className="h-4 w-4 rounded border-zinc-300"
          />
          Full width card (span 2 columns)
        </label>
      </div>
    </div>
  );
}
