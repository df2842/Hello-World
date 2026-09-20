import Link from "next/link";
import { getSupabase, type Joke } from "@/lib/supabase";

// Always read fresh rows from Supabase instead of prerendering at build time.
export const dynamic = "force-dynamic";

export const metadata = { title: "Jokes" };

async function loadJokes(): Promise<{ jokes: Joke[]; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      jokes: [],
      error:
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }
  const { data, error } = await supabase
    .from("jokes")
    .select("id, setup, punchline, category, created_at")
    .order("id", { ascending: true });
  return { jokes: (data as Joke[] | null) ?? [], error: error?.message ?? null };
}

export default async function JokesPage() {
  const { jokes, error } = await loadJokes();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        &larr; Home
      </Link>
      <h1 className="mt-4 text-4xl font-bold">Jokes</h1>
      <p className="mt-2 text-zinc-500">
        {error ? "Could not load jokes." : `${jokes.length} rows from Supabase`}
      </p>

      {error ? (
        <p className="mt-8 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          {error}
        </p>
      ) : jokes.length === 0 ? (
        <p className="mt-8 text-zinc-500">The jokes table is empty.</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {jokes.map((joke) => (
            <li
              key={joke.id}
              className="rounded-xl border border-zinc-200 p-5 shadow-sm dark:border-zinc-800"
            >
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {joke.category}
              </span>
              <p className="mt-3 font-medium">{joke.setup}</p>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                {joke.punchline}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
