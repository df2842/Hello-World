import Link from "next/link";
import { notFound } from "next/navigation";
import CaptionStage from "@/components/CaptionStage";
import Confetti from "@/components/Confetti";
import { getImage } from "@/lib/gallery";

export const dynamic = "force-dynamic";
// "Write more jokes" runs the AI from this page's server action.
export const maxDuration = 60;
export const metadata = { title: "Vote on jokes" };

export default async function ImagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const [{ id }, { new: isNew }] = await Promise.all([params, searchParams]);
  const { image, viewerId, error } = await getImage(id);
  if (error) throw new Error(error);
  if (!image) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      {isNew && <Confetti />}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link href="/gallery" className="text-muted hover:text-primary">
          ← Back to the Arena
        </Link>
        {viewerId === image.user_id && (
          <Link href="/me" className="text-muted hover:text-primary">
            My Jokes
          </Link>
        )}
        <Link href="/rate" className="text-muted hover:text-primary">
          ⚡ Rate mode
        </Link>
      </div>
      {isNew && (
        <p className="mt-3 inline-block animate-rise rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground">
          Fresh out of the prompt chain. Cast the first vote!
        </p>
      )}
      <div className="mt-4">
        <CaptionStage image={image} signedIn={!!viewerId} isOwner={viewerId === image.user_id} />
      </div>
    </main>
  );
}
