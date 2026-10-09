"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import MemeActions from "@/components/MemeActions";
import MoreJokes from "@/components/MoreJokes";
import VoteButtons from "@/components/VoteButtons";
import { deleteImage } from "@/app/actions/votes";
import { prettyModel } from "@/lib/joke-styles";
import type { ImageWithCaptions } from "@/lib/types";

type Props = {
  image: ImageWithCaptions;
  signedIn: boolean;
  isOwner: boolean;
};

/**
 * The detail view: the photo with whichever joke is selected burned in, and
 * every joke for this picture with thumbs up/down. ↑/↓ switch jokes.
 */
export default function CaptionStage({ image, signedIn, isOwner }: Props) {
  const router = useRouter();
  // Votes refresh the page with re-ranked jokes; keep the order the viewer
  // first saw so nothing jumps under their cursor. New jokes go at the end.
  const [initialOrder] = useState(() => image.captions.map((c) => c.id));
  const rank = new Map(initialOrder.map((id, i) => [id, i]));
  const captions = [...image.captions].sort(
    (a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity),
  );

  const [activeId, setActiveId] = useState(captions[0]?.id ?? null);
  const [deleting, startDelete] = useTransition();
  const active = captions.find((c) => c.id === activeId) ?? captions[0];
  const totalVotes = captions.reduce((n, c) => n + c.upvotes + c.downvotes, 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (captions.length === 0) return;
      e.preventDefault();
      const i = captions.findIndex((c) => c.id === activeId);
      const next = e.key === "ArrowDown" ? i + 1 : i - 1;
      const wrapped = (next + captions.length) % captions.length;
      setActiveId(captions[wrapped].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, captions]);

  const remove = () => {
    if (!confirm("Delete this picture and all its jokes and votes?")) return;
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

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <div className="self-start lg:sticky lg:top-20">
        <figure className="relative overflow-hidden rounded-3xl border border-border bg-black shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.public_url} alt={image.description} className="block max-h-[70vh] w-full object-contain" />
          {active && (
            <figcaption
              key={active.id}
              className="meme-text pointer-events-none absolute inset-x-0 top-0 animate-rise p-5 text-center"
            >
              {active.text}
            </figcaption>
          )}
        </figure>
        {active && (
          <div className="mt-3">
            <MemeActions imageUrl={image.public_url} text={active.text} sharePath={`/gallery/${image.id}`} />
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold">Which joke lands?</h2>
        <p className="mt-1 text-sm text-muted">
          👍 if it made you smile, 👎 if it didn&apos;t. Click a joke to put it on the photo, or use ↑ ↓.
          {totalVotes > 0 && ` ${totalVotes} vote${totalVotes === 1 ? "" : "s"} so far.`}
        </p>

        {captions.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-border p-6 text-center text-muted">
            No jokes for this picture yet.
          </p>
        ) : (
          <ol className="mt-5 space-y-3">
            {captions.map((c, i) => {
              const selected = c.id === active?.id;
              return (
                <li
                  key={c.id}
                  className={`rounded-2xl border p-4 transition ${
                    selected
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className="flex w-full items-start gap-2 text-left"
                    aria-pressed={selected}
                  >
                    <span className="inline-grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-accent-foreground">
                      {i === 0 && c.score > 0 ? "👑" : i + 1}
                    </span>
                    <span className="font-medium">{c.text}</span>
                  </button>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-8">
                    <VoteButtons
                      captionId={c.id}
                      upvotes={c.upvotes}
                      downvotes={c.downvotes}
                      myVote={c.myVote}
                      signedIn={signedIn}
                      size="sm"
                    />
                    <span className="text-[11px] text-muted">by {prettyModel(c.model)}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {isOwner && (
          <div className="mt-6">
            <MoreJokes imageId={image.id} compact />
          </div>
        )}

        <details className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm">
          <summary className="cursor-pointer font-medium">What the AI saw (step 1 of the prompt chain)</summary>
          <p className="mt-2 leading-relaxed text-muted">{image.description}</p>
        </details>

        {isOwner && (
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            className="mt-4 text-xs text-muted underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete this picture"}
          </button>
        )}
      </div>
    </div>
  );
}
