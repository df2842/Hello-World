import Link from "next/link";
import { getSiteStats } from "@/lib/gallery";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stats = await getSiteStats();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-8 text-center">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-primary">Hello World 👋</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-6xl">
          Your photos.
          <br />
          <span className="text-primary">AI&apos;s jokes.</span> Your vote.
        </h1>
      </div>

      <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
        <Link href="/rate" className="btn btn-lg btn-primary flex-1">
          ⚡ Rate jokes
        </Link>
        <Link href="/upload" className="btn btn-lg btn-secondary flex-1">
          📸 Upload a photo
        </Link>
      </div>

      <dl className="grid w-full max-w-md grid-cols-3 gap-3">
        {[
          { label: "Photos", value: stats.pictures },
          { label: "Jokes", value: stats.jokes },
          { label: "Votes", value: stats.votes },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-3">
            <dd className="text-3xl font-extrabold text-primary">{s.value}</dd>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{s.label}</dt>
          </div>
        ))}
      </dl>
    </main>
  );
}
