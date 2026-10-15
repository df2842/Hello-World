import RateDeck from "@/components/RateDeck";
import { getRateQueue } from "@/lib/gallery";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rate" };

export default async function RatePage() {
  const { queue, viewerId, ratedCount } = await getRateQueue();

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">
      <h1 className="sr-only">Rate jokes</h1>
      <RateDeck initialQueue={queue} signedIn={!!viewerId} ratedBefore={ratedCount} />
    </main>
  );
}
