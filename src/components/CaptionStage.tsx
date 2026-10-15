"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import MemeActions from "@/components/MemeActions";
import MoreJokes from "@/components/MoreJokes";
import VoteButtons from "@/components/VoteButtons";
import { deleteImage } from "@/app/actions/votes";
import type { ImageWithCaptions } from "@/lib/types";

type Props = {
  image: ImageWithCaptions;
  signedIn: boolean;
  isOwner: boolean;
};

/**
 * The photo page: the photo, and its jokes one at a time underneath (or
 * beside it on wide or short screens), each with big 👍/👎 buttons. The ← / →
 * buttons or arrow keys flip between jokes. Everything fits on one screen.
 */
export default function CaptionStage({ image, signedIn, isOwner }: Props) {
  const router = useRouter();
  // Votes refresh the page with re-ranked jokes; keep the order the viewer
  // first saw so nothing jumps. New jokes go at the end.
  const [initialOrder] = useState(() => image.captions.map((c) => c.id));
  const rank = new Map(initialOrder.map((id, i) => [id, i]));
  const captions = [...image.captions].sort(
    (a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity),
  );

  const [activeId, setActiveId] = useState(captions[0]?.id ?? null);
  const [deleting, startDelete] = useTransition();
  const index = Math.max(0, captions.findIndex((c) => c.id === activeId));
  const active = captions[index];

  const go = (delta: number) => {
    if (captions.length === 0) return;
    const next = (index + delta + captions.length) % captions.length;
    setActiveId(captions[next].id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (document.querySelector("dialog[open]")) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const remove = () => {
    if (!confirm("Delete this photo and all its jokes and votes?")) return;
    startDelete(async () => {
      let result;
      try {
        result = await deleteImage(image.id);
      } catch {
        alert("Couldn't reach the server. Please try again.");
        return;
      }
      if (result.ok) {
        router.push("/me");
        router.refresh();
      } else alert(result.error);
    });
  };

  const deleteButton = isOwner ? (
    <button
      type="button"
      onClick={remove}
      disabled={deleting}
      className="btn btn-sm flex-1 border-2 border-down/40 bg-card text-down shadow-none hover:bg-down/10"
    >
      {deleting ? "Deleting…" : "🗑 Delete"}
    </button>
  ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-5 short:grid short:grid-cols-2">
      <figure className="relative min-h-20 flex-1 overflow-hidden rounded-3xl bg-black shadow-lg lg:h-full short:h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.public_url} alt={image.description} className="absolute inset-0 h-full w-full object-contain" />
      </figure>

      <section
        aria-label="Jokes for this photo"
        className="flex shrink-0 flex-col justify-center gap-3 overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5 lg:h-full lg:gap-4 short:h-full short:gap-2 short:p-3"
      >
        {active ? (
          <>
            <div className="flex items-center justify-between gap-2">
              {captions.length > 1 ? (
                <button type="button" onClick={() => go(-1)} className="btn btn-secondary w-12 px-0" aria-label="Previous joke">
                  ←
                </button>
              ) : (
                <span />
              )}
              <p className="text-center text-sm font-bold text-muted">
                Joke {index + 1} of {captions.length}
                {index === 0 && active.score > 0 && " · 👑"}
              </p>
              {captions.length > 1 ? (
                <button type="button" onClick={() => go(1)} className="btn btn-secondary w-12 px-0" aria-label="Next joke">
                  →
                </button>
              ) : (
                <span />
              )}
            </div>
            <p
              key={active.id}
              title={active.text}
              className={`line-clamp-4 animate-rise text-center font-bold leading-snug short:line-clamp-2 ${
                active.text.length > 80 ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"
              }`}
            >
              {active.text}
            </p>
            <VoteButtons
              key={`vote-${active.id}`}
              captionId={active.id}
              upvotes={active.upvotes}
              downvotes={active.downvotes}
              myVote={active.myVote}
              signedIn={signedIn}
              size="lg"
              stretch
            />
            <div className="flex gap-1.5">
              <MemeActions imageUrl={image.public_url} text={active.text} sharePath={`/gallery/${image.id}`} />
              {isOwner && <MoreJokes imageId={image.id} />}
              {deleteButton}
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="font-bold">No jokes for this photo yet.</p>
            {isOwner && (
              <div className="mt-3 flex justify-center gap-2">
                <MoreJokes imageId={image.id} />
                {deleteButton}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
