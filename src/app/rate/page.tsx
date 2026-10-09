import RateDeck from "@/components/RateDeck";
import { getRateQueue } from "@/lib/gallery";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rate jokes" };

export default async function RatePage() {
  const { queue, viewerId, ratedCount } = await getRateQueue();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <header className="mx-auto mb-6 max-w-xl text-center">
        <span className="rounded-full bg-accent/25 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
          Rate mode
        </span>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          Funny or <span className="text-primary">meh?</span>
        </h1>
        <p className="mt-2 text-muted">
          One AI-written joke at a time. Vote fast, trust your gut, see if the crowd agrees.
        </p>
      </header>
      <RateDeck initialQueue={queue} signedIn={!!viewerId} ratedBefore={ratedCount} />
    </main>
  );
}
