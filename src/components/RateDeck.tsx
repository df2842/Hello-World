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
        setReveal(total === 1 ? "First vote on this joke!" : `${agree}% agree with you`);
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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl border-4 border-dashed border-border p-8 text-center">
        <p className="text-5xl">{ratedBefore > 0 ? "🏆" : "🫥"}</p>
        <p className="text-xl font-extrabold">{ratedBefore > 0 ? "You've rated every joke!" : "No jokes to rate yet"}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/upload" className="btn btn-lg btn-primary">
            📸 Upload a photo
          </Link>
          <Link href="/gallery" className="btn btn-lg btn-secondary">
            🏟️ Arena
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    const ups = history.filter((h) => h.vote === 1).length;
    const downs = history.filter((h) => h.vote === -1).length;
    return (
      <div className="flex flex-1 animate-rise flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-5xl">🎉</p>
        <p className="text-2xl font-extrabold">Deck cleared!</p>
        <p className="text-lg font-semibold">
          👍 {ups} · 👎 {downs}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            disabled={saving > 0}
            className="btn btn-lg btn-primary"
          >
            {saving > 0 ? "Saving votes…" : "⚡ More jokes"}
          </button>
          <Link href="/upload" className="btn btn-lg btn-secondary">
            📸 Upload
          </Link>
        </div>
        {history.length > 0 && (
          <button type="button" onClick={undo} className="btn btn-sm btn-secondary">
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
    <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col gap-3 short:max-w-3xl short:gap-2">
      <div className="flex shrink-0 items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(index / queue.length) * 100}%` }} />
        </div>
        <span className="text-sm font-bold tabular-nums text-muted">
          {index + 1} / {queue.length}
        </span>
        {history.length > 0 && (
          <button type="button" onClick={undo} className="btn btn-sm btn-secondary" title="Undo (Z)">
            ↩ Undo
          </button>
        )}
      </div>

      {!signedIn && (
        <button type="button" onClick={goSignIn} className="btn btn-accent w-full shrink-0 short:h-9">
          Sign in with Google to vote
        </button>
      )}

      {/* The entrance animation lives on this wrapper; the card inside is moved
          by inline transform/opacity, which a running animation would override. */}
      <div key={current.id} className="flex min-h-0 flex-1 animate-rise flex-col">
        <div
          className="flex min-h-0 flex-1 touch-pan-y select-none flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl short:flex-row"
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
          <div className="relative min-h-0 flex-1 bg-black short:basis-1/2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.image.public_url}
              alt={current.image.description}
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain"
            />
            {intent && (
              <span
                className={`pointer-events-none absolute top-4 rounded-xl border-4 bg-black/40 px-4 py-1 text-2xl font-black uppercase tracking-wider ${
                  intent === "up"
                    ? "left-4 -rotate-12 border-emerald-400 text-emerald-300"
                    : "right-4 rotate-12 border-rose-400 text-rose-300"
                }`}
              >
                {intent === "up" ? "Funny" : "Meh"}
              </span>
            )}
          </div>
          <p
            title={current.text}
            className="line-clamp-4 shrink-0 p-4 text-center text-lg font-bold leading-snug sm:text-xl short:basis-1/2 short:self-center short:text-base"
          >
            {current.text}
          </p>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2">
        <button
          type="button"
          onClick={() => act(-1)}
          aria-label="Meh, downvote (left arrow)"
          title="Meh (←)"
          className="btn btn-lg border-2 border-down bg-down/10 text-down hover:bg-down hover:text-white"
        >
          <span aria-hidden className="text-2xl">👎</span> Meh
        </button>
        <button type="button" onClick={() => act(0)} aria-label="Skip (down arrow)" title="Skip (↓)" className="btn btn-secondary">
          Skip
        </button>
        <button
          type="button"
          onClick={() => act(1)}
          aria-label="Funny, upvote (right arrow)"
          title="Funny (→)"
          className="btn btn-lg border-2 border-up bg-up/10 text-up hover:bg-up hover:text-white"
        >
          <span aria-hidden className="text-2xl">👍</span> Funny
        </button>
      </div>

      <p role="status" aria-live="polite" className={`min-h-5 shrink-0 text-center text-sm font-semibold ${error ? "text-down" : "text-muted"}`}>
        {error ?? reveal ?? ""}
      </p>
    </div>
  );
}
