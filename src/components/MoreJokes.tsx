"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { generateMoreCaptions } from "@/app/actions/votes";
import StylePicker from "@/components/StylePicker";
import type { JokeStyle } from "@/lib/joke-styles";

/**
 * "✨ More jokes" button for a photo's owner. Opens a small dialog to pick a
 * joke style; the AI writes a fresh batch and the page refreshes.
 */
export default function MoreJokes({ imageId }: { imageId: string }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [style, setStyle] = useState<JokeStyle>("mixed");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setMessage(null);
    startTransition(async () => {
      let result;
      try {
        result = await generateMoreCaptions(imageId, style);
      } catch {
        setMessage({ ok: false, text: "Couldn't reach the server. Try again." });
        return;
      }
      if (result.ok) {
        dialogRef.current?.close();
        router.refresh();
      } else {
        setMessage({ ok: false, text: result.error });
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMessage(null);
          dialogRef.current?.showModal();
        }}
        className="btn btn-sm btn-accent flex-1"
        title="Have the AI write more jokes for this photo"
      >
        ✨ More
      </button>
      <dialog
        ref={dialogRef}
        className="m-auto w-[min(92vw,28rem)] rounded-3xl border border-border bg-card p-6 text-foreground shadow-2xl backdrop:bg-black/50"
      >
        <h2 className="text-lg font-extrabold">Write more jokes</h2>
        <div className="mt-4">
          <StylePicker value={style} onChange={setStyle} disabled={pending} />
        </div>
        {message && (
          <p role="alert" className={`mt-3 text-sm font-medium ${message.ok ? "text-up" : "text-down"}`}>
            {message.text}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => dialogRef.current?.close()} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button type="button" onClick={run} disabled={pending} className="btn btn-primary flex-1">
            {pending ? "Writing…" : "✨ Write 4"}
          </button>
        </div>
      </dialog>
    </>
  );
}
