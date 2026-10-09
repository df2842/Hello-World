import Link from "next/link";
import { getLeaderboard, getSiteStats } from "@/lib/gallery";

export const dynamic = "force-dynamic";

const STEPS = [
  { emoji: "📸", title: "Upload a photo", body: "Your pet, your lunch, your questionable haircut. Anything goes." },
  { emoji: "🤖", title: "The AI writes jokes", body: "One model describes the picture, a second prompt writes jokes about it." },
  { emoji: "👍", title: "Everyone votes", body: "Thumbs up what lands, thumbs down what doesn't. The best rise to the top." },
];

export default async function Home() {
  const [stats, [top]] = await Promise.all([getSiteStats(), getLeaderboard(1)]);

  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-12 pt-16 text-center">
        <span className="rounded-full bg-accent/25 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
          Hello World 👋 · COMS E6998 · Design for Generative AI
        </span>
        <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-tight sm:text-6xl">
          Your photos. <span className="text-primary">AI&apos;s jokes.</span> The crowd&apos;s verdict.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Upload a picture, watch an AI write jokes about it, then vote on which ones actually land.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/rate"
            className="rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow transition hover:brightness-110"
          >
            ⚡ Start rating jokes
          </Link>
          <Link
            href="/upload"
            className="rounded-full border-2 border-primary px-6 py-3 text-base font-semibold text-primary transition hover:bg-primary/10"
          >
            📸 Upload a photo
          </Link>
        </div>

        <dl className="mt-10 grid w-full max-w-lg grid-cols-3 gap-3">
          {[
            { label: "Photos", value: stats.pictures },
            { label: "AI jokes", value: stats.jokes },
            { label: "Votes", value: stats.votes },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
              <dd className="text-3xl font-bold tabular-nums text-primary">{s.value}</dd>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {top && (
        <section className="mx-auto w-full max-w-3xl px-6 pb-12">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-muted">Top-rated joke right now</h2>
          <Link
            href={`/gallery/${top.image.id}`}
            className="@container group relative mx-auto mt-3 block max-w-md overflow-hidden rounded-3xl border border-border bg-black shadow-xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={top.image.public_url}
              alt={top.image.description}
              className="block max-h-96 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
            <p className="meme-text meme-card absolute inset-x-0 top-0 line-clamp-4 p-4 text-center">{top.text}</p>
            <span className="absolute bottom-3 right-3 rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
              👍 {top.upvotes}
            </span>
          </Link>
        </section>
      )}

      <section className="border-t border-border bg-card/60 py-14">
        <div className="mx-auto grid w-full max-w-5xl gap-6 px-6 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="text-center">
              <p className="text-4xl">{s.emoji}</p>
              <p className="mt-3 font-bold">
                {i + 1}. {s.title}
              </p>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
