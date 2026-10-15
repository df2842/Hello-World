/** Shimmering placeholder shown while a data-heavy page loads; fits the screen. */
export default function PageSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <main
      className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 px-3 py-4 sm:px-6"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-9 w-48 shrink-0 animate-pulse rounded-xl bg-border" />
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
        {Array.from({ length: cards }, (_, i) => (
          <div
            key={i}
            className={`animate-pulse rounded-2xl bg-border ${i > 0 ? "hidden sm:block" : ""} ${i > 1 ? "sm:hidden lg:block" : ""}`}
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </main>
  );
}
