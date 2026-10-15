"use client";

import { useRouter } from "next/navigation";
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
  /** Stretch the two buttons to fill the row. */
  stretch?: boolean;
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
 * Two big, labeled buttons: 👍 Funny and 👎 Meh, each with its count.
 * Optimistic updates; clicking your current vote again removes it (the
 * server is told the exact target state, never "toggle"). Visitors who are
 * not signed in go to the login page and come back here afterwards.
 */
export default function VoteButtons({
  captionId,
  upvotes,
  downvotes,
  myVote,
  signedIn,
  size = "md",
  stretch = false,
  onVoted,
}: Props) {
  const router = useRouter();
  const [state, setState] = useState({ upvotes, downvotes, myVote });
  // Follow fresh server values (e.g. after a refresh) whenever no vote of
  // ours is in flight; React's "adjust state when props change" pattern.
  const [seen, setSeen] = useState({ upvotes, downvotes, myVote });
  const [pop, setPop] = useState<Vote>(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!pending && (seen.upvotes !== upvotes || seen.downvotes !== downvotes || seen.myVote !== myVote)) {
    setSeen({ upvotes, downvotes, myVote });
    setState({ upvotes, downvotes, myVote });
  }

  // Only called from click handlers, so reading window is safe; keeps ?sort etc.
  const goSignIn = () =>
    router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search || "/gallery")}`);

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
        setError("Couldn't save. Try again.");
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
    sm: "h-10 gap-1.5 px-3 text-sm",
    md: "h-12 gap-2 px-4 text-base",
    lg: "h-14 gap-1.5 px-3 text-base sm:gap-2 sm:px-6 sm:text-lg",
  }[size];

  const base = `inline-flex items-center justify-center rounded-2xl border-2 font-bold tabular-nums shadow-sm transition active:scale-95 disabled:cursor-wait focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary ${sizes} ${
    stretch ? "min-w-0 flex-1" : ""
  }`;
  const hint = signedIn ? undefined : "Sign in to vote";

  return (
    <div className={`flex flex-col gap-1 ${stretch ? "w-full" : ""}`}>
      <div className={`flex items-center gap-2 ${stretch ? "w-full" : ""}`} role="group" aria-label="Rate this joke">
        <button
          type="button"
          onClick={() => vote(1)}
          disabled={pending}
          aria-pressed={state.myVote === 1}
          aria-label={`Funny, upvote (${state.upvotes})`}
          title={hint ?? (state.myVote === 1 ? "Remove your upvote" : "Funny")}
          className={`${base} ${
            state.myVote === 1
              ? "border-up bg-up text-white"
              : "border-up/50 bg-up/10 text-up hover:border-up hover:bg-up/20"
          } ${pop === 1 ? "animate-pop" : ""}`}
        >
          <span aria-hidden>👍</span>
          {size !== "sm" && <span>Funny</span>}
          <span className="rounded-lg bg-black/10 px-1.5">{state.upvotes}</span>
        </button>
        <button
          type="button"
          onClick={() => vote(-1)}
          disabled={pending}
          aria-pressed={state.myVote === -1}
          aria-label={`Meh, downvote (${state.downvotes})`}
          title={hint ?? (state.myVote === -1 ? "Remove your downvote" : "Meh")}
          className={`${base} ${
            state.myVote === -1
              ? "border-down bg-down text-white"
              : "border-down/50 bg-down/10 text-down hover:border-down hover:bg-down/20"
          } ${pop === -1 ? "animate-pop" : ""}`}
        >
          <span aria-hidden>👎</span>
          {size !== "sm" && <span>Meh</span>}
          <span className="rounded-lg bg-black/10 px-1.5">{state.downvotes}</span>
        </button>
      </div>
      {error && (
        <span role="alert" className="text-xs font-medium text-down">
          {error}
        </span>
      )}
    </div>
  );
}
