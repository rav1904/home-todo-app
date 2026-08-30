export function PageLoadingSkeleton({
  rows = 5,
  label = "Loading page",
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-3 overflow-x-hidden p-3 sm:p-4 lg:p-5"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="h-7 w-36 max-w-full animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />
      <div className="h-20 max-w-full animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
      <div className="flex max-w-full gap-2 overflow-hidden">
        <div className="h-9 w-16 shrink-0 animate-pulse rounded-full bg-stone-200 dark:bg-stone-800" />
        <div className="h-9 w-20 shrink-0 animate-pulse rounded-full bg-stone-200 dark:bg-stone-800" />
        <div className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-stone-200 dark:bg-stone-800" />
      </div>
      <ul className="min-w-0 space-y-2 overflow-hidden rounded-xl border border-stone-200/80 bg-white p-2 dark:border-stone-700/80 dark:bg-stone-900">
        {Array.from({ length: rows }).map((_, index) => (
          <li
            key={index}
            className="h-12 max-w-full animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800/80"
          />
        ))}
      </ul>
      <span className="sr-only">{label}…</span>
    </div>
  );
}
