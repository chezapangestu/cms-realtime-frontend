export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={[
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900",
        className,
      ].join(" ")}
      aria-label="Loading"
    />
  );
}
