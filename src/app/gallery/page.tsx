import Link from "next/link";
import { ArenaGrid } from "@/components/StableJokeList";
import { getGallery } from "@/lib/gallery";

export const dynamic = "force-dynamic";
export const metadata = { title: "Arena" };

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort: rawSort } = await searchParams;
  const sort = rawSort === "top" ? "top" : "new";
  const { images, viewerId, error } = await getGallery();
  const signedIn = !!viewerId;

  const best = (img: (typeof images)[number]) => img.captions[0]?.score ?? -Infinity;
  const ordered = sort === "top" ? [...images].sort((a, b) => best(b) - best(a)) : images;

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-3 py-4 sm:px-6">
      <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Arena</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-2xl border-2 border-foreground/15 bg-card p-1" role="group" aria-label="Sort">
            <Link
              href="/gallery"
              aria-current={sort === "new" ? "page" : undefined}
              className={`rounded-xl px-3 py-1.5 text-sm font-bold ${sort === "new" ? "bg-foreground text-background" : "text-muted"}`}
            >
              Newest
            </Link>
            <Link
              href="/gallery?sort=top"
              aria-current={sort === "top" ? "page" : undefined}
              className={`rounded-xl px-3 py-1.5 text-sm font-bold ${sort === "top" ? "bg-foreground text-background" : "text-muted"}`}
            >
              Top
            </Link>
          </div>
          <Link href="/upload" className="btn btn-primary">
            + Upload
          </Link>
        </div>
      </header>

      {error ? (
        <p className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-800">Couldn&apos;t load photos: {error}</p>
      ) : images.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl border-4 border-dashed border-border p-8 text-center">
          <p className="text-5xl">🫥</p>
          <p className="text-lg font-bold">No photos yet</p>
          <Link href="/upload" className="btn btn-lg btn-primary">
            📸 Upload the first one
          </Link>
        </div>
      ) : (
        <ArenaGrid key={sort} images={ordered} signedIn={signedIn} viewerId={viewerId} />
      )}
    </main>
  );
}
