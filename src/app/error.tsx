"use client";

import Link from "next/link";

/** Friendly fallback for unexpected errors, with a retry. */
export default function Error({
  retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** Re-fetches the failed segment's server data and re-renders it. */
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-5xl">🙃</p>
      <h1 className="mt-4 text-2xl font-bold">That joke didn&apos;t land</h1>
      <p className="mt-2 text-muted">Something went wrong loading this page. It&apos;s usually temporary.</p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow"
        >
          Try again
        </button>
        <Link href="/" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">
          Home
        </Link>
      </div>
    </main>
  );
}
