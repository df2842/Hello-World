import FitGrid, { type FitRule } from "@/components/FitGrid";
import { createClient } from "@/lib/supabase/server";
import { categoryStyle, type Joke } from "@/lib/jokes";

// Always read fresh rows from Supabase instead of prerendering at build time.
export const dynamic = "force-dynamic";
export const metadata = { title: "Jokes" };

const JOKE_RULES: FitRule[] = [
  { minWidth: 1024, minHeight: 700, cols: 4, rows: 2 },
  { minWidth: 640, minHeight: 700, cols: 2, rows: 3 },
  { minWidth: 640, cols: 2, rows: 2 },
  { minHeight: 700, cols: 1, rows: 3 },
  { cols: 1, rows: 2 },
];

async function loadJokes(): Promise<{ jokes: Joke[]; error: string | null }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { jokes: [], error: "Supabase is not configured." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jokes")
    .select("id, setup, punchline, category, created_at")
    .order("id", { ascending: true });
  return { jokes: (data as Joke[] | null) ?? [], error: error?.message ?? null };
}

/** Week 2: rows read from the Supabase `jokes` table. */
export default async function JokesPage() {
  const { jokes, error } = await loadJokes();

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">
      <h1 className="mb-3 shrink-0 text-2xl font-extrabold sm:text-3xl">
        Jokes <span className="text-base font-bold text-muted">· {jokes.length} from Supabase</span>
      </h1>

      {error ? (
        <p className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-800">{error}</p>
      ) : jokes.length === 0 ? (
        <p className="text-muted">The jokes table is empty.</p>
      ) : (
        <FitGrid label="Jokes" rules={JOKE_RULES}>
          {jokes.map((joke) => (
            <div
              key={joke.id}
              className="flex w-full flex-col justify-center gap-2 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <span
                className={`self-start rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${categoryStyle(joke.category)}`}
              >
                {joke.category}
              </span>
              <p className="line-clamp-3 font-bold">{joke.setup}</p>
              <p className="line-clamp-2 text-muted">{joke.punchline}</p>
            </div>
          ))}
        </FitGrid>
      )}
    </main>
  );
}
