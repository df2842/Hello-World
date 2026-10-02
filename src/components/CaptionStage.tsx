"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import VoteButtons from "@/components/VoteButtons";
import { deleteImage } from "@/app/actions/votes";
import type { ImageWithCaptions } from "@/lib/types";

type Props = {
  image: ImageWithCaptions;
  signedIn: boolean;
  isOwner: boolean;
};

/**
 * The detail view: the photo with whichever caption is selected burned in,
 * and the caption list with voting. Arrow keys switch captions.
 */
export default function CaptionStage({ image, signedIn, isOwner }: Props) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(image.captions[0]?.id ?? null);
  const [deleting, startDelete] = useTransition();
  const active = image.captions.find((c) => c.id === activeId) ?? image.captions[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      if (image.captions.length === 0) return;
      e.preventDefault();
      const i = image.captions.findIndex((c) => c.id === activeId);
      const next = e.key === "ArrowDown" ? i + 1 : i - 1;
      const wrapped = (next + image.captions.length) % image.captions.length;
      setActiveId(image.captions[wrapped].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, image.captions]);

  const remove = () => {
    if (!confirm("Delete this image and all its captions and votes?")) return;
    startDelete(async () => {
      const result = await deleteImage(image.id);
      if (result.ok) router.push("/gallery");
      else alert(result.error);
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <figure className="relative self-start overflow-hidden rounded-3xl border border-border bg-black shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.public_url} alt={image.description} className="block max-h-[75vh] w-full object-contain" />
        {active && (
          <figcaption
            key={active.id}
            className="meme-text pointer-events-none absolute inset-x-0 top-0 animate-rise p-5 text-center"
          >
            {active.text}
          </figcaption>
        )}
      </figure>

      <div>
        <h2 className="text-xl font-bold">Pick the funniest caption</h2>
        <p className="mt-1 text-sm text-muted">
          Click a caption to preview it on the photo. Use ↑ ↓ to flip through. Vote with the arrows.
        </p>

        <ol className="mt-5 space-y-3">
          {image.captions.map((c, i) => {
            const selected = c.id === active?.id;
            return (
              <li
                key={c.id}
                className={`flex items-start gap-3 rounded-2xl border p-4 transition ${
                  selected
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className="flex-1 text-left"
                  aria-pressed={selected}
                >
                  <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {i === 0 && c.score > 0 ? "👑" : i + 1}
                  </span>
                  <span className="font-medium">{c.text}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {c.upvotes} up · {c.downvotes} down
                  </span>
                </button>
                <VoteButtons captionId={c.id} score={c.score} myVote={c.myVote} signedIn={signedIn} />
              </li>
            );
          })}
        </ol>

        <details className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm">
          <summary className="cursor-pointer font-medium">What Gemini saw</summary>
          <p className="mt-2 leading-relaxed text-muted">{image.description}</p>
        </details>

        {isOwner && (
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            className="mt-4 text-xs text-muted underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete this image"}
          </button>
        )}
      </div>
    </div>
  );
}
