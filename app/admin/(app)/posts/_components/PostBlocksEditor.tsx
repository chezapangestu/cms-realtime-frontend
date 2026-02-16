"use client";

import { useMemo } from "react";
import { RichTextEditor } from "../../../../components/RichTextEditor";

type Fields = Record<string, string>;

export function PostBlocksEditor({
  fields,
  setFields,
  visibleBlocks,
  setVisibleBlocks,
  disabled,
}: {
  fields: Fields;
  setFields: React.Dispatch<React.SetStateAction<Fields>>;
  visibleBlocks: number;
  setVisibleBlocks: React.Dispatch<React.SetStateAction<number>>;
  disabled: boolean;
}) {
  const fieldPairs = useMemo(
    () => Array.from({ length: 10 }).map((_, i) => i + 1),
    [],
  );

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        {fieldPairs.slice(0, visibleBlocks).map((n) => (
          <div
            key={n}
            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
          >
            <div className="text-xs font-medium text-zinc-500">Block {n}</div>

            <label className="mt-3 block text-sm font-medium text-zinc-800">
              Title {n}
            </label>
            <input
              value={fields[`title_${n}`] || ""}
              disabled={disabled}
              onChange={(e) =>
                setFields((prev) => ({
                  ...prev,
                  [`title_${n}`]: e.target.value,
                }))
              }
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
            />

            <label className="mt-3 block text-sm font-medium text-zinc-800">
              Description {n}
            </label>
            <RichTextEditor
              value={fields[`description_${n}`] || ""}
              disabled={disabled}
              onChange={(html) =>
                setFields((prev) => ({
                  ...prev,
                  [`description_${n}`]: html,
                }))
              }
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || visibleBlocks >= 10}
          onClick={() => setVisibleBlocks((v) => Math.min(10, v + 1))}
          className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          + Add Block
        </button>

        <button
          type="button"
          disabled={disabled || visibleBlocks <= 1}
          onClick={() => {
            const removedIndex = visibleBlocks;
            const next = Math.max(1, visibleBlocks - 1);

            setFields((prev) => ({
              ...prev,
              [`title_${removedIndex}`]: "",
              [`description_${removedIndex}`]: "",
            }));
            setVisibleBlocks(next);
          }}
          className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
        >
          Remove Last Block
        </button>

        <div className="self-center text-xs text-zinc-500">
          Showing {visibleBlocks}/10
        </div>
      </div>
    </div>
  );
}
