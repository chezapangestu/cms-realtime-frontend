"use client";

import { Spinner } from "../../../../components/Spinner";

export function NoticeToast({
  open,
  statusText,
  errorText,
  isBusy,
  busyLabel,
  onClose,
}: {
  open: boolean;
  statusText: string;
  errorText: string;
  isBusy: boolean;
  busyLabel: string;
  onClose: () => void;
}) {
  if (!open) return null;
  if (!statusText && !errorText) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-[min(420px,calc(100vw-2rem))]">
      <div
        className={[
          "rounded-2xl border p-4 shadow-lg backdrop-blur bg-white/95",
          errorText ? "border-rose-200" : "border-zinc-200",
        ].join(" ")}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          {isBusy ? <Spinner className="mt-0.5" /> : null}

          <div className="min-w-0 flex-1 space-y-1">
            {errorText ? (
              <div className="text-sm font-semibold text-rose-800">
                {errorText}
              </div>
            ) : null}

            {statusText ? (
              <div className="text-sm text-zinc-800">
                {statusText} {busyLabel ? `(${busyLabel})` : ""}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
