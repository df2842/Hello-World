"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { castVote } from "@/app/actions/votes";
import type { CaptionWithImage } from "@/lib/types";

type Action = { id: string; vote: 1 | -1 | 0 };
type Leaving = "left" | "right" | "down" | null;

const SWIPE_THRESHOLD = 110;

/**
 * Rate mode: one joke at a time. 👍/👎 with buttons, arrow keys or a swipe.
 * After each vote the crowd's verdict is revealed. Votes are saved through
 * the same server action as everywhere else in the app.
 */
export default function RateDeck({
  initialQueue,
  signedIn,
  ratedBefore,
}: {
  initialQueue: CaptionWithImage[];
  signedIn: boolean;
  ratedBefore: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // Keep the deck we started with, even if the page re-renders on the server.
  const [queue] = useState(initialQueue);
  const [saving, setSaving] = useState(0);
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<Action[]>([]);
  const [leaving, setLeaving] = useState<Leaving>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [reveal, setReveal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragStart = useRef<number | null>(null);
  const busy = useRef(false);

  const current = queue[index];
  const next = queue[index + 1];
  const done = index >= queue.length;

  const goSignIn = useCallback(
    () => router.push(`/login?next=${encodeURIComponent(pathname || "/rate")}`),
    [router, pathname],
  );

  /** Saves a vote in the background, tracking how many are still in flight. */
  const save = useCallback(
    (captionId: string, target: 1 | -1 | 0) => {
      setSaving((n) => n + 1);
      castVote(captionId, target, { quiet: true })
        .then((result) => {
          if (!result.ok) {
            setError(result.error);
            if (result.needsSignIn) goSignIn();
          }
        })
        .catch(() => setError("A vote wasn't saved. Check your connection."))
        .finally(() => setSaving((n) => n - 1));
    },
    [goSignIn],
  );

  // Don't let a reload or tab close drop votes that are still being saved.
  useEffect(() => {
    if (saving === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saving]);

  const act = useCallback(
    (vote: 1 | -1 | 0) => {
      if (!current || busy.current) return;
      if (!signedIn && vote !== 0) return goSignIn();
      busy.current = true;
      setError(null);
      setLeaving(vote === 1 ? "right" : vote === -1 ? "left" : "down");

      if (vote !== 0) {
        const up = current.upvotes + (vote === 1 ? 1 : 0);
        const down = current.downvotes + (vote === -1 ? 1 : 0);
        const total = up + down;
        const agree = Math.round(((vote === 1 ? up : down) / total) * 100);
        setReveal(
          total === 1
            ? "First vote on this joke!"
            : `${agree}% of ${total} voters agree with you · 👍 ${up} 👎 ${down}`,
        );
        save(current.id, vote);
      } else {
        setReveal(null);
      }

      setTimeout(() => {
        setHistory((h) => [...h, { id: current.id, vote }]);
        setIndex((i) => i + 1);
        setLeaving(null);
        setDragX(0);
        busy.current = false;
      }, 260);
    },
    [current, signedIn, goSignIn, save],
  );

  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last || busy.current) return;
    if (last.vote !== 0) save(last.id, 0); // clear the vote on the server
    setHistory((h) => h.slice(0, -1));
    setIndex((i) => Math.max(0, i - 1));
    setReveal(null);
  }, [history, save]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "arrowright" || key === "l") act(1);
      else if (key === "arrowleft" || key === "h") act(-1);
      else if (key === "arrowdown" || key === "s") act(0);
      else if (key === "z" || key === "backspace") undo();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, undo]);

  // Warm the browser cache for the next picture.
  useEffect(() => {
    if (next) new Image().src = next.image.public_url;
  }, [next]);

  if (queue.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border-4 border-dashed border-border p-12 text-center">
        <p className="text-5xl">{ratedBefore > 0 ? "🏆" : "🫥"}</p>
        <p className="mt-4 text-xl font-bold">
          {ratedBefore > 0 ? "You've rated every joke!" : "No jokes to rate yet"}
        </p>
        <p className="mt-2 text-muted">
          {ratedBefore > 0
            ? `${ratedBefore} vote${ratedBefore === 1 ? "" : "s"} cast. Upload a photo to make more jokes for everyone.`
            : "Upload a photo and the AI will write the first batch."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/upload" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow">
            Upload a photo
          </Link>
          <Link href="/gallery" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">
            Browse the Arena
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    const ups = history.filter((h) => h.vote === 1).length;
    const downs = history.filter((h) => h.vote === -1).length;
    return (
      <div className="mx-auto max-w-lg animate-rise rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
        <p className="text-5xl">🎉</p>
        <p className="mt-4 text-2xl font-bold">Deck cleared!</p>
        <p className="mt-2 text-muted">
          You laughed at {ups}, shrugged at {downs}
          {history.length - ups - downs > 0 ? ` and skipped ${history.length - ups - downs}` : ""}.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            disabled={saving > 0}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow disabled:opacity-60"
          >
            {saving > 0 ? "Saving votes…" : "Load more jokes"}
          </button>
          <Link href="/gallery" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">
            See the leaderboard
          </Link>
          <Link href="/upload" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">
            Upload a photo
          </Link>
        </div>
        {history.length > 0 && (
          <button type="button" onClick={undo} className="mt-4 text-xs text-muted hover:text-primary">
            ↩ Undo last
          </button>
        )}
      </div>
    );
  }

  const offset =
    leaving === "right" ? 600 : leaving === "left" ? -600 : leaving === "down" ? 0 : dragX;
  const tilt = offset / 25;
  const intent = dragX > 40 ? "up" : dragX < -40 ? "down" : null;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex items-center justify-between text-sm text-muted">
        <span>
          Joke {index + 1} of {queue.length}
        </span>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-border" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(index / queue.length) * 100}%` }} />
        </div>
      </div>

      {!signedIn && (
        <p className="mb-3 rounded-2xl border border-accent bg-accent/15 px-4 py-2 text-sm">
          You&apos;re previewing.{" "}
          <button type="button" onClick={goSignIn} className="font-semibold text-primary underline">
            Sign in
          </button>{" "}
          to vote. It takes one click with Google.
        </p>
      )}

      {/* The entrance animation lives on this wrapper; the card inside is moved
          by inline transform/opacity, which a running animation would override. */}
      <div key={current.id} className="animate-rise">
      <div
        className="relative touch-pan-y select-none overflow-hidden rounded-3xl border border-border bg-black shadow-xl"
        style={{
          transform: `translateX(${offset}px) translateY(${leaving === "down" ? 80 : 0}px) rotate(${tilt}deg)`,
          opacity: leaving ? 0 : 1,
          transition: dragging ? "none" : "transform 0.26s ease-out, opacity 0.26s ease-out",
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          dragStart.current = e.clientX;
          setDragging(true);
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (dragStart.current === null) return;
          setDragX(e.clientX - dragStart.current);
        }}
        onPointerUp={() => {
          if (dragStart.current === null) return;
          dragStart.current = null;
          setDragging(false);
          if (dragX > SWIPE_THRESHOLD) act(1);
          else if (dragX < -SWIPE_THRESHOLD) act(-1);
          else setDragX(0);
        }}
        onPointerCancel={() => {
          dragStart.current = null;
          setDragging(false);
          setDragX(0);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.image.public_url}
          alt={current.image.description}
          draggable={false}
          className="block max-h-[58vh] w-full object-contain"
        />
        <p className="meme-text pointer-events-none absolute inset-x-0 top-0 p-5 text-center">{current.text}</p>
        {intent && (
          <span
            className={`pointer-events-none absolute bottom-6 rounded-xl border-4 px-4 py-1 text-2xl font-black uppercase tracking-wider ${
              intent === "up"
                ? "left-6 -rotate-12 border-emerald-400 text-emerald-300"
                : "right-6 rotate-12 border-rose-400 text-rose-300"
            }`}
          >
            {intent === "up" ? "Funny" : "Meh"}
          </span>
        )}
      </div>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <button
          type="button"
          onClick={() => act(-1)}
          aria-label="Downvote: not funny (left arrow)"
          className="flex h-16 items-center justify-center gap-2 rounded-2xl border-2 border-rose-300 bg-card text-lg font-bold text-rose-700 shadow-sm transition hover:bg-rose-50 active:scale-95 dark:text-rose-300 dark:hover:bg-rose-950"
        >
          <span aria-hidden className="text-2xl">👎</span> Meh
        </button>
        <button
          type="button"
          onClick={() => act(0)}
          aria-label="Skip (down arrow)"
          className="h-12 rounded-full border border-border bg-card px-4 text-sm font-medium text-muted transition hover:text-foreground active:scale-95"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={() => act(1)}
          aria-label="Upvote: funny (right arrow)"
          className="flex h-16 items-center justify-center gap-2 rounded-2xl border-2 border-emerald-300 bg-card text-lg font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50 active:scale-95 dark:text-emerald-300 dark:hover:bg-emerald-950"
        >
          <span aria-hidden className="text-2xl">👍</span> Funny
        </button>
      </div>

      <div className="mt-4 flex min-h-6 flex-wrap items-center justify-between gap-2 text-sm">
        <span role="status" aria-live="polite" className={error ? "text-red-600" : "text-muted"}>
          {error ?? reveal ?? ""}
        </span>
        {history.length > 0 && (
          <button type="button" onClick={undo} className="text-muted hover:text-primary">
            ↩ Undo
          </button>
        )}
      </div>

      <p className="mt-6 hidden text-center text-xs text-muted sm:block">
        Shortcuts: <kbd className="rounded border border-border px-1">←</kbd> meh ·{" "}
        <kbd className="rounded border border-border px-1">→</kbd> funny ·{" "}
        <kbd className="rounded border border-border px-1">↓</kbd> skip ·{" "}
        <kbd className="rounded border border-border px-1">Z</kbd> undo
      </p>
      <p className="mt-6 text-center text-xs text-muted sm:hidden">Tip: swipe the picture right for 👍, left for 👎.</p>
    </div>
  );
}
