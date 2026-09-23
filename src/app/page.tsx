import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
        COMS E6998 · Design for Generative AI
      </span>
      <h1 className="mt-6 text-5xl font-bold sm:text-6xl">
        Hello <span className="text-primary">World</span>
      </h1>
      <p className="mt-4 max-w-md text-lg text-muted">
        A tiny Next.js app on Vercel that reads jokes from Supabase and keeps
        the good stuff behind Google sign-in.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/jokes"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:brightness-110"
        >
          Browse jokes
        </Link>
        <Link
          href="/profile"
          className="rounded-full border-2 border-primary px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/10"
        >
          Members area →
        </Link>
      </div>
    </main>
  );
}
