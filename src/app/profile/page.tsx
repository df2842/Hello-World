import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { categoryStyle, type Joke } from "@/lib/jokes";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already redirects anonymous users; this is defense in depth.
  if (!user) redirect("/login?next=/profile");

  const meta = user.user_metadata ?? {};
  const name = (meta.full_name as string | undefined) ?? "Friend";
  const avatar = meta.avatar_url as string | undefined;

  // Members get a personal joke, chosen deterministically from their user id.
  const { data } = await supabase
    .from("jokes")
    .select("id, setup, punchline, category, created_at")
    .order("id");
  const jokes = (data as Joke[] | null) ?? [];
  const seed = Array.from(user.id).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const joke = jokes.length ? jokes[seed % jokes.length] : null;

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col justify-center px-4 py-3 sm:px-6">
      <h1 className="text-3xl font-extrabold">
        Hi, {name.split(" ")[0]}! <span className="text-base font-bold text-muted">· members only</span>
      </h1>

      <section className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:gap-4">
        <div className="flex items-start">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              referrerPolicy="no-referrer"
              className="h-16 w-16 rounded-2xl border-4 border-primary/20 shadow sm:h-24 sm:w-24"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl sm:h-24 sm:w-24 sm:text-4xl">
              🙂
            </div>
          )}
        </div>
        <dl className="min-w-0 rounded-2xl border border-border bg-card px-4 py-2 shadow-sm">
          <Row label="Name" value={name} />
          <Row label="Email" value={user.email ?? "—"} />
          <Row
            label="Last sign-in"
            value={
              user.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString("en-US")
                : "—"
            }
          />
        </dl>
      </section>

      {joke && (
        <section className="mt-3 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Your members-only joke</h2>
          <span
            className={`mt-3 inline-block rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${categoryStyle(joke.category)}`}
          >
            {joke.category}
          </span>
          <p className="mt-2 text-lg font-bold">{joke.setup}</p>
          <p className="mt-1 text-muted">{joke.punchline}</p>
        </section>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/me" className="btn btn-primary">
          😂 My Jokes
        </Link>
        <Link href="/jokes" className="btn btn-secondary">
          Jokes table
        </Link>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-row gap-3 border-b border-border py-1.5 last:border-0">
      <dt className="w-20 shrink-0 text-sm font-medium text-muted sm:w-28">{label}</dt>
      <dd className={`min-w-0 truncate ${mono ? "font-mono text-sm" : ""}`}>{value}</dd>
    </div>
  );
}
