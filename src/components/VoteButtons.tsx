"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { castVote } from "@/app/actions/votes";
import type { Vote } from "@/lib/types";

type Props = {
  captionId: string;
  upvotes: number;
  downvotes: number;
  myVote: Vote;
  signedIn: boolean;
  size?: "sm" | "md" | "lg";
  /** Called after the server confirms the vote. */
  onVoted?: (myVote: Vote) => void;
};

function tally(upvotes: number, downvotes: number, from: Vote, to: Vote) {
  return {
    upvotes: upvotes - (from === 1 ? 1 : 0) + (to === 1 ? 1 : 0),
    downvotes: downvotes - (from === -1 ? 1 : 0) + (to === -1 ? 1 : 0),
  };
}

/**
 * Thumbs up / thumbs down with live counts and optimistic updates.
 * Clicking your current vote again removes it (the server is told the exact
 * target state, never "toggle"). Visitors who are not signed in are sent to
 * the login page and brought back here afterwards.
 */
export default function VoteButtons({
  captionId,
  upvotes,
  downvotes,
  myVote,
  signedIn,
  size = "md",
  onVoted,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState({ upvotes, downvotes, myVote });
  const [pop, setPop] = useState<Vote>(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const goSignIn = () => router.push(`/login?next=${encodeURIComponent(pathname || "/gallery")}`);

  const vote = (value: 1 | -1) => {
    if (!signedIn) return goSignIn();
    if (pending) return;
    const prev = state;
    const next: Vote = state.myVote === value ? 0 : value;
    setState({ ...tally(state.upvotes, state.downvotes, state.myVote, next), myVote: next });
    setPop(value);
    setTimeout(() => setPop(0), 450);
    setError(null);

    startTransition(async () => {
      let result;
      try {
        result = await castVote(captionId, next);
      } catch {
        setState(prev);
        setError("Couldn't reach the server. Check your connection and try again.");
        return;
      }
      if (!result.ok) {
        setState(prev);
        setError(result.error);
        if (result.needsSignIn) goSignIn();
        return;
      }
      onVoted?.(result.myVote);
    });
  };

  const sizes = {
    sm: "h-8 gap-1 px-2.5 text-xs",
    md: "h-9 gap-1.5 px-3 text-sm",
    lg: "h-14 gap-2 px-6 text-lg",
  }[size];

  const base = `inline-flex items-center rounded-full border font-semibold tabular-nums transition active:scale-95 disabled:cursor-wait ${sizes}`;
  const hint = signedIn ? undefined : "Sign in to vote";

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <div className="inline-flex items-center gap-2" role="group" aria-label="Rate this joke">
        <button
          type="button"
          onClick={() => vote(1)}
          disabled={pending}
          aria-pressed={state.myVote === 1}
          aria-label={`Upvote (${state.upvotes})`}
          title={hint ?? (state.myVote === 1 ? "Remove upvote" : "Upvote: this is funny")}
          className={`${base} ${
            state.myVote === 1
              ? "border-emerald-600 bg-emerald-600 text-white shadow"
              : "border-border bg-card hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300"
          } ${pop === 1 ? "animate-pop" : ""}`}
        >
          <span aria-hidden>👍</span>
          {size === "lg" && <span>Funny</span>}
          <span>{state.upvotes}</span>
        </button>
        <button
          type="button"
          onClick={() => vote(-1)}
          disabled={pending}
          aria-pressed={state.myVote === -1}
          aria-label={`Downvote (${state.downvotes})`}
          title={hint ?? (state.myVote === -1 ? "Remove downvote" : "Downvote: not funny")}
          className={`${base} ${
            state.myVote === -1
              ? "border-rose-600 bg-rose-600 text-white shadow"
              : "border-border bg-card hover:border-rose-500 hover:text-rose-700 dark:hover:text-rose-300"
          } ${pop === -1 ? "animate-pop" : ""}`}
        >
          <span aria-hidden>👎</span>
          {size === "lg" && <span>Meh</span>}
          <span>{state.downvotes}</span>
        </button>
      </div>
      {!signedIn && size !== "lg" && (
        <button type="button" onClick={goSignIn} className="text-xs text-muted hover:text-primary">
          Sign in to vote
        </button>
      )}
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
