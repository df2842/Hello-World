"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import MemeActions from "@/components/MemeActions";
import MoreJokes from "@/components/MoreJokes";
import VoteButtons from "@/components/VoteButtons";
import { prettyModel } from "@/lib/joke-styles";
import type { CaptionWithImage, ImageWithCaptions, ScoredCaption } from "@/lib/types";

/**
 * Votes re-render the page with re-ranked data. These lists keep the order
 * (and, optionally, the items) the viewer first saw, so the joke you just
 * voted on never jumps away or disappears mid-click. New items go at the end.
 * `removed` holds ids that were kept from the snapshot but are no longer live.
 */
function useStable<T extends { id: string }>(items: T[], keepRemoved: boolean) {
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

const formatScore = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** One of the viewer's pictures with every joke written for it (My Jokes). */
export function PictureRow({ image }: { image: ImageWithCaptions }) {
  const { list } = useStable(image.captions, false);
  // Feature the joke that was on top when the page loaded, even after votes.
  const [featuredId] = useState(() => image.captions[0]?.id ?? null);
  const best = list.find((c) => c.id === featuredId) ?? list[0];
  const votes = list.reduce((n, c) => n + c.upvotes + c.downvotes, 0);

  return (
    <article className="grid gap-4 rounded-3xl border border-border bg-card p-4 shadow-sm md:grid-cols-[240px_1fr]">
      <div>
        <Link href={`/gallery/${image.id}`} className="relative block overflow-hidden rounded-2xl bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.public_url} alt={image.description} className="block aspect-square w-full object-cover" />
          {best && <p className="meme-text meme-sm absolute inset-x-0 top-0 line-clamp-4 p-2 text-center">{best.text}</p>}
        </Link>
        <p className="mt-2 text-xs text-muted">
          {new Date(image.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          })}{" "}
          · {list.length} jokes · {votes} votes
        </p>
        {best && (
          <div className="mt-2">
            <MemeActions imageUrl={image.public_url} text={best.text} sharePath={`/gallery/${image.id}`} compact />
          </div>
        )}
      </div>
      <div>
        <PictureJokes captions={list} />
        <div className="mt-3">
          <MoreJokes imageId={image.id} compact />
        </div>
      </div>
    </article>
  );
}

function PictureJokes({ captions }: { captions: ScoredCaption[] }) {
  return (
    <ol className="space-y-2">
      {captions.map((c, i) => (
        <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
          <p className="min-w-0 flex-1 text-sm">
            <span className="mr-2 font-bold text-muted">{i === 0 && c.score > 0 ? "👑" : `${i + 1}.`}</span>
            {c.text}
          </p>
          <VoteButtons captionId={c.id} upvotes={c.upvotes} downvotes={c.downvotes} myVote={c.myVote} signedIn size="sm" />
        </li>
      ))}
    </ol>
  );
}

/**
 * Flat list of jokes across pictures, each with its thumbnail. Shows `empty`
 * only if there was nothing to show when the page first loaded, so removing
 * your last vote doesn't yank the list away.
 */
export function JokeList({
  jokes,
  empty,
  header,
  showRank = false,
  keepRemoved = false,
}: {
  jokes: CaptionWithImage[];
  empty: ReactNode;
  header?: ReactNode;
  showRank?: boolean;
  keepRemoved?: boolean;
}) {
  const { list, removed } = useStable(jokes, keepRemoved);
  if (list.length === 0) return <>{empty}</>;

  return (
    <>
      {header}
      <ol className="space-y-2">
      {list.map((c, i) => {
        // A kept row whose vote was removed: take that vote out of its score.
        const score = removed.has(c.id) ? c.score - c.myVote : c.score;
        return (
          <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
            {showRank && <span className="w-6 text-center text-sm font-bold text-muted">{i + 1}</span>}
            <Link href={`/gallery/${c.image.id}`} className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image.public_url} alt={c.image.description} className="h-14 w-14 rounded-xl object-cover" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{c.text}</p>
              <p className="text-xs text-muted">
                Score {formatScore(score)} · by {prettyModel(c.model)}
              </p>
            </div>
            <VoteButtons captionId={c.id} upvotes={c.upvotes} downvotes={c.downvotes} myVote={c.myVote} signedIn size="sm" />
          </li>
        );
      })}
      </ol>
    </>
  );
}
