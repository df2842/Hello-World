"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import FitGrid, { ROW_RULES } from "@/components/FitGrid";
import MemeCard from "@/components/MemeCard";
import VoteButtons from "@/components/VoteButtons";
import type { CaptionWithImage, ImageWithCaptions } from "@/lib/types";

/**
 * Votes re-render the page with re-ranked data. These lists keep the order
 * (and, optionally, the items) the viewer first saw, so the thing you just
 * voted on never jumps away or disappears mid-click. New items go at the end.
 * `removed` holds ids that were kept from the snapshot but are no longer live.
 */
export function useStable<T extends { id: string }>(items: T[], keepRemoved: boolean) {
  const [snapshot] = useState(() => items);
  const current = new Map(items.map((i) => [i.id, i]));
  const firstSeen = new Set(snapshot.map((i) => i.id));
  const removed = new Set<string>();
  const kept = snapshot.flatMap((s) => {
    const live = current.get(s.id);
    if (live) return [live];
    if (!keepRemoved) return [];
    removed.add(s.id);
    return [s];
  });
  return { list: [...kept, ...items.filter((i) => !firstSeen.has(i.id))], removed };
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Arena photo cards in a stable order (a vote never reshuffles the grid). */
export function ArenaGrid({
  images,
  signedIn,
  viewerId,
}: {
  images: ImageWithCaptions[];
  signedIn: boolean;
  viewerId: string | null;
}) {
  const { list } = useStable(images, false);
  return (
    <FitGrid label="Photos" minItemHeight={250}>
      {list.map((image) => (
        <MemeCard key={image.id} image={image} signedIn={signedIn} viewerId={viewerId} />
      ))}
    </FitGrid>
  );
}

/** The viewer's photos as cards: photo on top, best joke below. */
export function PhotoGrid({ images, empty }: { images: ImageWithCaptions[]; empty: ReactNode }) {
  if (images.length === 0) return <>{empty}</>;
  return (
    <FitGrid label="My photos" minItemHeight={200}>
      {images.map((image) => {
        const best = image.captions[0];
        const ups = image.captions.reduce((n, c) => n + c.upvotes, 0);
        const downs = image.captions.reduce((n, c) => n + c.downvotes, 0);
        return (
          <Link
            key={image.id}
            href={`/gallery/${image.id}`}
            className="group flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-primary"
          >
            <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.public_url}
                alt={image.description}
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <div className="shrink-0 space-y-1 p-3">
              <p className="line-clamp-2 min-h-[2.75rem] font-semibold leading-snug">{best?.text ?? "No jokes yet."}</p>
              <p className="flex items-center justify-between gap-2 text-sm font-bold">
                <span>
                  <span className="text-up">👍 {ups}</span> <span className="ml-2 text-down">👎 {downs}</span>
                </span>
                <span className="text-primary">Open →</span>
              </p>
            </div>
          </Link>
        );
      })}
    </FitGrid>
  );
}

/** Height of one joke row, kept in sync with the row markup below. */
const JOKE_ROW_HEIGHT = 124;

/**
 * Jokes across photos, one fixed-height row each: thumbnail, the joke (up to
 * three lines, full width), then score and 👍/👎. Shows `empty` only if there
 * was nothing when the page first loaded, so removing your last vote doesn't
 * yank the list away.
 */
export function JokeRows({
  jokes,
  empty,
  keepRemoved = false,
}: {
  jokes: CaptionWithImage[];
  empty: ReactNode;
  keepRemoved?: boolean;
}) {
  const { list, removed } = useStable(jokes, keepRemoved);
  if (list.length === 0) return <>{empty}</>;

  return (
    <FitGrid label="Jokes" rules={ROW_RULES} rowHeight={JOKE_ROW_HEIGHT}>
      {list.map((c) => {
        // A kept row whose vote was removed: take that vote out of its score.
        const score = removed.has(c.id) ? c.score - c.myVote : c.score;
        return (
          <div
            key={c.id}
            className="grid h-full w-full grid-cols-[3.5rem_minmax(0,1fr)] gap-3 overflow-hidden rounded-2xl border border-border bg-card p-2.5 shadow-sm"
          >
            <Link href={`/gallery/${c.image.id}`} className="shrink-0" aria-label="Open photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image.public_url} alt={c.image.description} className="h-14 w-14 rounded-xl object-cover" />
            </Link>
            <div className="flex min-w-0 flex-col justify-between gap-1">
              <p className="line-clamp-3 text-sm font-semibold leading-snug" title={c.text}>
                {c.text}
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-muted">Score {signed(score)}</span>
                <VoteButtons
                  captionId={c.id}
                  upvotes={c.upvotes}
                  downvotes={c.downvotes}
                  myVote={c.myVote}
                  signedIn
                  size="sm"
                />
              </div>
            </div>
          </div>
        );
      })}
    </FitGrid>
  );
}
