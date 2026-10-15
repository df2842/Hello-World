import Link from "next/link";
import { redirect } from "next/navigation";
import { JokeRows, PhotoGrid } from "@/components/StableJokeList";
import { getMyJokes } from "@/lib/gallery";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Jokes" };

const TABS = [
  { key: "photos", label: "📸 Photos" },
  { key: "jokes", label: "😂 Jokes" },
  { key: "votes", label: "🗳️ My votes" },
] as const;
type Tab = (typeof TABS)[number]["key"];

function Empty({ emoji, title, href, cta }: { emoji: string; title: string; href: string; cta: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl border-4 border-dashed border-border p-8 text-center">
      <p className="text-5xl">{emoji}</p>
      <p className="text-lg font-bold">{title}</p>
      <Link href={href} className="btn btn-lg btn-primary">
        {cta}
      </Link>
    </div>
  );
}

export default async function MyJokesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === params.tab) ? (params.tab as Tab) : "photos";
  const sort = params.sort === "new" ? "new" : "best";

  const { viewerId, images, allJokes, myVotes, stats, error } = await getMyJokes();
  // The proxy already redirects visitors; this is defense in depth.
  if (!viewerId) redirect("/login?next=/me");

  const jokes =
    sort === "new" ? [...allJokes].sort((a, b) => b.created_at.localeCompare(a.created_at)) : allJokes;

  const tiles = [
    { label: "Photos", value: stats.pictures },
    { label: "Jokes", value: stats.jokes },
    { label: "Votes got", value: stats.votesReceived },
    { label: "Score", value: stats.netScore > 0 ? `+${stats.netScore}` : stats.netScore },
  ];

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-3 px-3 py-3 sm:px-6 sm:py-4">
      <header className="flex shrink-0 items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">My Jokes</h1>
        <Link href="/upload" className="btn btn-primary">
          + Upload
        </Link>
      </header>

      <dl className="grid shrink-0 grid-cols-4 gap-2 short:hidden">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-border bg-card px-3 py-2">
            <dd className="text-xl font-extrabold text-primary sm:text-2xl">{t.value}</dd>
            <dt className="truncate text-[11px] font-bold uppercase tracking-wide text-muted">{t.label}</dt>
          </div>
        ))}
      </dl>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <nav className="flex gap-1.5" aria-label="My Jokes sections">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/me?tab=${t.key}`}
              aria-current={tab === t.key ? "page" : undefined}
              className={`btn btn-sm ${tab === t.key ? "bg-foreground text-background" : "btn-secondary"}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        {tab === "jokes" && allJokes.length > 1 && (
          <div className="flex gap-1.5" aria-label="Sort">
            <Link href="/me?tab=jokes&sort=best" className={`btn btn-sm ${sort === "best" ? "btn-accent" : "btn-secondary"}`}>
              Best
            </Link>
            <Link href="/me?tab=jokes&sort=new" className={`btn btn-sm ${sort === "new" ? "btn-accent" : "btn-secondary"}`}>
              Newest
            </Link>
          </div>
        )}
      </div>

      {error && (
        <p className="shrink-0 rounded-2xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          Couldn&apos;t load: {error}
        </p>
      )}

      {tab === "photos" && (
        <PhotoGrid
          images={images}
          empty={<Empty emoji="📸" title="No photos yet" href="/upload" cta="📸 Upload a photo" />}
        />
      )}
      {tab === "jokes" && (
        <JokeRows
          key={`jokes-${sort}`}
          jokes={jokes}
          empty={<Empty emoji="✍️" title="No jokes yet" href="/upload" cta="📸 Upload a photo" />}
        />
      )}
      {tab === "votes" && (
        <JokeRows
          key="votes"
          jokes={myVotes}
          keepRemoved
          empty={<Empty emoji="🗳️" title="No votes yet" href="/rate" cta="⚡ Start rating" />}
        />
      )}
    </main>
  );
}
