"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generateMoreCaptions } from "@/app/actions/votes";
import StylePicker from "@/components/StylePicker";
import type { JokeStyle } from "@/lib/joke-styles";

/** Lets a picture's owner ask the model for a fresh batch of jokes. */
export default function MoreJokes({ imageId, compact = false }: { imageId: string; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(!compact);
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
        setMessage({ ok: false, text: "Couldn't reach the server. Please try again." });
        return;
      }
      if (result.ok) {
        setMessage({ ok: true, text: `Added ${result.added.length} new joke${result.added.length === 1 ? "" : "s"}.` });
        router.refresh();
      } else {
        setMessage({ ok: false, text: result.error });
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium hover:border-primary hover:text-primary"
      >
        ✨ Write more jokes
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
      <p className="text-sm font-semibold">Want different jokes for this picture?</p>
      <p className="mt-0.5 text-xs text-muted">Pick a style and the AI writes a fresh batch. Old jokes stay.</p>
      <div className="mt-3">
        <StylePicker value={style} onChange={setStyle} disabled={pending} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "Writing…" : "✨ Write 4 more"}
        </button>
        {message && (
          <span role="status" className={`text-sm ${message.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-600"}`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
