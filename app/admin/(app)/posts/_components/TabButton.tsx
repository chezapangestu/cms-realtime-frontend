"use client";

export function TabButton({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-1 rounded-2xl border px-4 py-3 text-left transition",
        active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50",
      ].join(" ")}
    >
      <div className="text-sm font-semibold">{title}</div>
      {desc ? (
        <div
          className={[
            "mt-0.5 text-xs",
            active ? "text-white/80" : "text-zinc-500",
          ].join(" ")}
        >
          {desc}
        </div>
      ) : null}
    </button>
  );
}
