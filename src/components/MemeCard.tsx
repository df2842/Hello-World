"use client";

import Link from "next/link";
import { useState } from "react";
import VoteButtons from "@/components/VoteButtons";
import type { ImageWithCaptions } from "@/lib/types";

/**
 * A gallery card: the photo on top, its best joke underneath (never on the
 * photo), and 👍/👎 for that joke. The photo stretches to fill the card's
 * grid cell so a whole page of cards fits the screen.
 */
export default function MemeCard({
  image,
  signedIn,
  viewerId,
}: {
  image: ImageWithCaptions;
  signedIn: boolean;
  viewerId: string | null;
}) {
  // A vote re-renders the gallery with re-ranked jokes. Keep featuring the
  // joke the viewer saw (and voted on) instead of swapping in another one.
  const [featuredId] = useState(() => image.captions[0]?.id ?? null);
  const top = image.captions.find((c) => c.id === featuredId) ?? image.captions[0];
  const more = image.captions.length - 1;

  return (
    <article className="flex w-full animate-rise flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <Link
        href={`/gallery/${image.id}`}
        className="group relative min-h-0 flex-1 overflow-hidden bg-black"
        aria-label="Open this photo and all its jokes"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.public_url}
          alt={image.description}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        {viewerId === image.user_id && (
          <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground shadow">
            Yours
          </span>
        )}
      </Link>

      <div className="shrink-0 space-y-2.5 p-3">
        <p
          className={`line-clamp-3 min-h-[2.75rem] font-semibold leading-snug ${top && top.text.length > 70 ? "text-sm" : ""}`}
          title={top?.text}
        >
          {top ? top.text : "No jokes yet."}
        </p>
        {top && (
          <div className="flex items-center justify-between gap-2">
            <VoteButtons
              key={top.id}
              captionId={top.id}
              upvotes={top.upvotes}
              downvotes={top.downvotes}
              myVote={top.myVote}
              signedIn={signedIn}
              size="sm"
            />
            <Link href={`/gallery/${image.id}`} className="btn btn-sm btn-secondary">
              {more > 0 ? `+${more} jokes` : "Open"}
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
