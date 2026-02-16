"use client";

import * as React from "react";
import { formatIDR, parseIDR } from "../../../../lib/idr";

export function DonationBlock({
  label,
  prefix,
  fields,
  setFields,
  disabled,
}: {
  label: string;
  prefix: "infak" | "wakaf" | "zakat";
  fields: Record<string, string>;
  setFields: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  disabled: boolean;
}) {
  const titleKey = `${prefix}_title`;
  const amountKey = `${prefix}_amount`;
  const targetEnabledKey = `${prefix}_target_enabled`;
  const targetKey = `${prefix}_target_amount`;

  const title = fields[titleKey] || "";
  const amount = Number(fields[amountKey] || 0);
  const targetEnabled = fields[targetEnabledKey] === "true";
  const target = Number(fields[targetKey] || 0);

  const progress =
    targetEnabled && target > 0
      ? Math.min(100, Math.round((amount / target) * 100))
      : 0;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="text-sm font-semibold text-zinc-900">{label}</div>

      <label className="mt-3 block text-sm font-medium text-zinc-800">
        Title
      </label>
      <input
        value={title}
        disabled={disabled}
        onChange={(e) =>
          setFields((prev) => ({ ...prev, [titleKey]: e.target.value }))
        }
        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
        placeholder={`Judul ${label}`}
      />

      <label className="mt-3 block text-sm font-medium text-zinc-800">
        Nominal Terkumpul (Rp)
      </label>
      <input
        value={formatIDR(amount)}
        disabled={disabled}
        inputMode="numeric"
        onChange={(e) =>
          setFields((prev) => ({
            ...prev,
            [amountKey]: String(parseIDR(e.target.value)),
          }))
        }
        className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
        placeholder="Rp 0"
      />

      <div className="mt-3 flex items-center gap-2">
        <input
          id={`${prefix}-target`}
          type="checkbox"
          checked={targetEnabled}
          disabled={disabled}
          onChange={(e) =>
            setFields((prev) => ({
              ...prev,
              [targetEnabledKey]: String(e.target.checked),
            }))
          }
          className="h-4 w-4 rounded border-zinc-300"
        />
        <label htmlFor={`${prefix}-target`} className="text-sm text-zinc-700">
          Enable Target Nominal
        </label>
      </div>

      {targetEnabled ? (
        <>
          <label className="mt-3 block text-sm font-medium text-zinc-800">
            Target Nominal (Rp)
          </label>
          <input
            value={formatIDR(target)}
            disabled={disabled}
            inputMode="numeric"
            onChange={(e) =>
              setFields((prev) => ({
                ...prev,
                [targetKey]: String(parseIDR(e.target.value)),
              }))
            }
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:opacity-60"
            placeholder="Rp 0"
          />

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <p>Progress</p>
              <span>{progress}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-zinc-900"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              {formatIDR(amount)} / {formatIDR(target)}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
