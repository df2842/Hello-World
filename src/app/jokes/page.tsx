import { createClient } from "@/lib/supabase/server";
import { categoryStyle, type Joke } from "@/lib/jokes";

// Always read fresh rows from Supabase instead of prerendering at build time.
export const dynamic = "force-dynamic";

export const metadata = { title: "Jokes" };

async function loadJokes(): Promise<{ jokes: Joke[]; error: string | null }> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return {
      jokes: [],
      error:
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }
  const supabase = await createClient();
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
      <h1 className="text-4xl font-bold">Jokes</h1>
      <p className="mt-2 text-muted">
        {error ? "Could not load jokes." : `${jokes.length} rows from Supabase`}
      </p>

      {error ? (
        <p className="mt-8 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          {error}
        </p>
      ) : jokes.length === 0 ? (
        <p className="mt-8 text-muted">The jokes table is empty.</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {jokes.map((joke) => (
            <li
              key={joke.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${categoryStyle(joke.category)}`}
              >
                {joke.category}
              </span>
              <p className="mt-3 font-medium">{joke.setup}</p>
              <p className="mt-2 text-muted">{joke.punchline}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
