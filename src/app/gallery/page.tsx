import Link from "next/link";
import MemeCard from "@/components/MemeCard";
import { getGallery, getLeaderboard } from "@/lib/gallery";

export const dynamic = "force-dynamic";
export const metadata = { title: "Caption Arena" };

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function GalleryPage() {
  const [{ images, error }, leaders] = await Promise.all([getGallery(), getLeaderboard()]);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
            Caption Arena
          </span>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
            Photos in. <span className="text-primary">Jokes out.</span> You judge.
          </h1>
          <p className="mt-2 max-w-xl text-muted">
            Every photo here was described by Claude, then captioned by Claude. The crowd decides
            which caption actually lands.
          </p>
        </div>
        <Link
          href="/upload"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:brightness-110"
        >
          + Upload a photo
        </Link>
      </header>

      {leaders.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Hall of fame</h2>
          <ol className="mt-3 grid gap-3 sm:grid-cols-3">
            {leaders.map((c, i) => (
              <li key={c.id} className="animate-rise" style={{ animationDelay: `${i * 90}ms` }}>
                <Link
                  href={`/gallery/${c.image.id}`}
                  className="flex h-full gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.image.public_url}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-xl leading-none">{MEDALS[i] ?? "🏅"}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-medium">{c.text}</p>
                    <p className="text-xs font-bold text-primary">+{c.score}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-10">
        {error ? (
          <p className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            Could not load the gallery: {error}
          </p>
        ) : images.length === 0 ? (
          <div className="rounded-3xl border-4 border-dashed border-border p-16 text-center">
            <p className="text-5xl">🫥</p>
            <p className="mt-4 text-lg font-semibold">Nothing to laugh at yet</p>
            <p className="mt-1 text-muted">Be the first to upload a photo and let Claude take a swing.</p>
            <Link
              href="/upload"
              className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Upload a photo
            </Link>
          </div>
        ) : (
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
            {images.map((image, i) => (
              <MemeCard key={image.id} image={image} index={i} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
