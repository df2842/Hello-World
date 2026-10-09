import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-5xl">🔍</p>
      <h1 className="mt-4 text-2xl font-bold">Nothing funny here</h1>
      <p className="mt-2 text-muted">That page or picture doesn&apos;t exist, or it was deleted.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/gallery" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow">
          Browse the Arena
        </Link>
        <Link href="/" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">
          Home
        </Link>
      </div>
    </main>
  );
}
