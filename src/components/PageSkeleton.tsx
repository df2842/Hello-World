/** Shimmering placeholder shown while a data-heavy page loads. */
export default function PageSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6" aria-busy="true" aria-label="Loading">
      <div className="h-6 w-32 animate-pulse rounded-full bg-border" />
      <div className="mt-4 h-10 w-2/3 animate-pulse rounded-xl bg-border" />
      <div className="mt-3 h-4 w-1/2 animate-pulse rounded-lg bg-border" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl bg-border" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    </main>
  );
}
