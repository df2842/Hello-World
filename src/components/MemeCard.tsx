"use client";

import Link from "next/link";
import { useState } from "react";
import VoteButtons from "@/components/VoteButtons";
import type { ImageWithCaptions } from "@/lib/types";

/**
 * A gallery tile: the photo with its best joke burned in meme-style, and
 * thumbs up/down for that joke right underneath.
 */
export default function MemeCard({
  image,
  index,
  signedIn,
  viewerId,
}: {
  image: ImageWithCaptions;
  index: number;
  signedIn: boolean;
  viewerId: string | null;
}) {
  // A vote re-renders the gallery with re-ranked jokes. Keep featuring the
  // joke the viewer saw (and voted on) instead of swapping in another one.
  const [featuredId] = useState(() => image.captions[0]?.id ?? null);
  const top = image.captions.find((c) => c.id === featuredId) ?? image.captions[0];
  const more = image.captions.length - 1;
  const mine = viewerId === image.user_id;

  return (
    <article
      className="mb-5 break-inside-avoid animate-rise overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-300 hover:shadow-xl"
      style={{ animationDelay: `${Math.min(index, 12) * 60}ms` }}
    >
      <Link href={`/gallery/${image.id}`} className="@container group relative block overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.public_url}
          alt={image.description}
          loading={index < 3 ? "eager" : "lazy"}
          className="block w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        {top && (
          <p className="meme-text meme-card pointer-events-none absolute inset-x-0 top-0 line-clamp-4 p-3 text-center">
            {top.text}
          </p>
        )}
        {mine && (
          <span className="absolute bottom-2 left-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground shadow">
            Your upload
          </span>
        )}
      </Link>

      {top ? (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3">
          <VoteButtons
            key={top.id}
            captionId={top.id}
            upvotes={top.upvotes}
            downvotes={top.downvotes}
            myVote={top.myVote}
            signedIn={signedIn}
            size="sm"
          />
          <Link href={`/gallery/${image.id}`} className="text-xs font-semibold text-primary hover:underline">
            {more > 0 ? `+${more} more joke${more === 1 ? "" : "s"} →` : "Open →"}
          </Link>
        </div>
      ) : (
        <p className="p-3 text-xs text-muted">No jokes yet.</p>
      )}
    </article>
  );
}
