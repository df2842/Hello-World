import Link from "next/link";
import type { ImageWithCaptions } from "@/lib/types";

/** A gallery tile: the photo with its top caption burned in meme-style. */
export default function MemeCard({ image, index }: { image: ImageWithCaptions; index: number }) {
  const top = image.captions[0];
  const totalVotes = image.captions.reduce((n, c) => n + c.upvotes + c.downvotes, 0);

  return (
    <Link
      href={`/gallery/${image.id}`}
      className="group mb-5 block break-inside-avoid animate-rise"
      style={{ animationDelay: `${Math.min(index, 12) * 60}ms` }}
    >
      <figure className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:rotate-[-0.6deg] group-hover:shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.public_url}
          alt={image.description}
          loading="lazy"
          className="block w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        {top && (
          <figcaption className="meme-text pointer-events-none absolute inset-x-0 top-0 p-4 text-center">
            {top.text}
          </figcaption>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-3 text-xs text-white">
          <span className="rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">
            {image.captions.length} caption{image.captions.length === 1 ? "" : "s"} · {totalVotes}{" "}
            vote{totalVotes === 1 ? "" : "s"}
          </span>
          {top && (
            <span
              className={`rounded-full px-2 py-0.5 font-bold backdrop-blur ${
                top.score > 0 ? "bg-primary" : "bg-white/20"
              }`}
            >
              {top.score > 0 ? `+${top.score}` : top.score}
            </span>
          )}
        </div>
      </figure>
    </Link>
  );
}
