import Link from "next/link";
import { redirect } from "next/navigation";
import { JokeList, PictureRow } from "@/components/StableJokeList";
import { getMyJokes } from "@/lib/gallery";

export const dynamic = "force-dynamic";
// "Write more jokes" runs the AI from this page's server action.
export const maxDuration = 60;
export const metadata = { title: "My Jokes" };

const TABS = [
  { key: "pictures", label: "My pictures" },
  { key: "jokes", label: "All my jokes" },
  { key: "votes", label: "My votes" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default async function MyJokesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === params.tab) ? (params.tab as Tab) : "pictures";
  const sort = params.sort === "new" ? "new" : "best";

  const { viewerId, images, allJokes, myVotes, stats, error } = await getMyJokes();
  // The proxy already redirects visitors; this is defense in depth.
  if (!viewerId) redirect("/login?next=/me");

  const jokes =
    sort === "new" ? [...allJokes].sort((a, b) => b.created_at.localeCompare(a.created_at)) : allJokes;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
            Members only
          </span>
          <h1 className="mt-3 text-4xl font-bold">My Jokes</h1>
          <p className="mt-1 text-muted">Every joke on every picture you&apos;ve uploaded, and how the crowd voted.</p>
        </div>
        <Link
          href="/upload"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:brightness-110"
        >
          + Upload a photo
        </Link>
      </header>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Pictures" value={stats.pictures} />
        <Stat label="Jokes" value={stats.jokes} />
        <Stat label="Votes received" value={stats.votesReceived} />
        <Stat label="Net score" value={stats.netScore > 0 ? `+${stats.netScore}` : stats.netScore} highlight />
        <Stat label="Votes you cast" value={stats.votesCast} />
      </dl>

      {stats.best && (
        <Link
          href={`/gallery/${stats.best.image.id}`}
          className="mt-4 flex items-center gap-4 rounded-2xl border-2 border-accent bg-accent/10 p-4 transition hover:shadow-md"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={stats.best.image.public_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">👑 Your best joke</p>
            <p className="mt-0.5 font-semibold">{stats.best.text}</p>
            <p className="text-xs text-muted">
              +{stats.best.score} · 👍 {stats.best.upvotes} 👎 {stats.best.downvotes}
            </p>
          </div>
        </Link>
      )}

      <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-border" aria-label="My Jokes sections">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/me?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold transition ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
            <span className="ml-1.5 rounded-full bg-border px-1.5 text-xs">
              {t.key === "pictures" ? images.length : t.key === "jokes" ? allJokes.length : myVotes.length}
            </span>
          </Link>
        ))}
      </nav>

      {error && (
        <p className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">Could not load your jokes: {error}</p>
      )}

      <section className="mt-6">
        {tab === "pictures" &&
          (images.length === 0 ? (
            <Empty
              emoji="📸"
              title="You haven't uploaded anything yet"
              body="Upload a photo and the AI writes jokes about it. They'll all show up here."
              href="/upload"
              cta="Upload your first photo"
            />
          ) : (
            <div className="space-y-6">
              {images.map((image) => (
                <PictureRow key={image.id} image={image} />
              ))}
            </div>
          ))}

        {tab === "jokes" && (
          <JokeList
            key={`jokes-${sort}`}
            jokes={jokes}
            showRank={sort === "best"}
            header={
              <div className="mb-3 flex gap-2 text-sm">
                <span className="text-muted">Sort:</span>
                <Link href="/me?tab=jokes&sort=best" className={sort === "best" ? "font-semibold text-primary" : "text-muted hover:text-foreground"}>
                  Best first
                </Link>
                <span className="text-muted">·</span>
                <Link href="/me?tab=jokes&sort=new" className={sort === "new" ? "font-semibold text-primary" : "text-muted hover:text-foreground"}>
                  Newest first
                </Link>
              </div>
            }
            empty={
              <Empty
                emoji="✍️"
                title="No jokes yet"
                body="Jokes are written for the pictures you upload."
                href="/upload"
                cta="Upload a photo"
              />
            }
          />
        )}

        {tab === "votes" && (
          <JokeList
            key="votes"
            jokes={myVotes}
            keepRemoved
            header={
              <p className="mb-3 text-sm text-muted">
                Changed your mind? Click your vote again to remove it, or the other thumb to flip it.
              </p>
            }
            empty={
              <Empty
                emoji="🗳️"
                title="You haven't voted yet"
                body="Rate mode serves jokes one at a time. It's the fastest way to vote."
                href="/rate"
                cta="Start rating"
              />
            }
          />
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className={`mt-1 text-3xl font-bold tabular-nums ${highlight ? "text-primary" : ""}`}>{value}</dd>
    </div>
  );
}

function Empty({ emoji, title, body, href, cta }: { emoji: string; title: string; body: string; href: string; cta: string }) {
  return (
    <div className="rounded-3xl border-4 border-dashed border-border p-12 text-center">
      <p className="text-5xl">{emoji}</p>
      <p className="mt-4 text-lg font-semibold">{title}</p>
      <p className="mt-1 text-muted">{body}</p>
      <Link href={href} className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
        {cta}
      </Link>
    </div>
  );
}
