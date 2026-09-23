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
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
        Members only
      </span>
      <h1 className="mt-4 text-4xl font-bold">
        Welcome, {name.split(" ")[0]}!
      </h1>
      <p className="mt-2 text-muted">
        This page is protected. You can only see it because you signed in with
        Google.
      </p>

      <section className="mt-8 grid gap-6 sm:grid-cols-[auto_1fr]">
        <div className="flex items-start">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              referrerPolicy="no-referrer"
              className="h-24 w-24 rounded-2xl border-4 border-primary/20 shadow"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 text-4xl">
              🙂
            </div>
          )}
        </div>
        <dl className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <Row label="Name" value={name} />
          <Row label="Email" value={user.email ?? "—"} />
          <Row
            label="Provider"
            value={(user.app_metadata?.provider as string | undefined) ?? "google"}
          />
          <Row label="User ID" value={user.id} mono />
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
        <section className="mt-10 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-6">
          <h2 className="text-lg font-semibold">Your members-only joke</h2>
          <span
            className={`mt-3 inline-block rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${categoryStyle(joke.category)}`}
          >
            {joke.category}
          </span>
          <p className="mt-3 text-xl font-medium">{joke.setup}</p>
          <p className="mt-2 text-lg text-muted">{joke.punchline}</p>
        </section>
      )}
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
    <div className="flex flex-col gap-0.5 border-b border-border py-2 last:border-0 sm:flex-row sm:gap-4">
      <dt className="w-28 shrink-0 text-sm font-medium text-muted">{label}</dt>
      <dd className={`break-all ${mono ? "font-mono text-sm" : ""}`}>{value}</dd>
    </div>
  );
}
