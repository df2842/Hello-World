import Link from "next/link";
import { notFound } from "next/navigation";
import CaptionStage from "@/components/CaptionStage";
import Confetti from "@/components/Confetti";
import { getImage } from "@/lib/gallery";

export const dynamic = "force-dynamic";
// "More jokes" runs the AI from this page's server action.
export const maxDuration = 60;
export const metadata = { title: "Vote" };

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
    <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">
      {isNew && <Confetti />}
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <Link href="/gallery" className="btn btn-sm btn-secondary">
          ← Arena
        </Link>
        {isNew && (
          <span className="animate-rise rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">
            🎉 Your jokes are ready!
          </span>
        )}
      </div>
      <CaptionStage image={image} signedIn={!!viewerId} isOwner={viewerId === image.user_id} />
    </main>
  );
}
