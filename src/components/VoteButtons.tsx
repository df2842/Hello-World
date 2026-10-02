"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { castVote } from "@/app/actions/votes";

type Props = {
  captionId: string;
  score: number;
  myVote: -1 | 0 | 1;
  signedIn: boolean;
  size?: "sm" | "lg";
};

/**
 * Up/down vote control with optimistic updates. Anonymous visitors see the
 * score and get sent to the login page when they try to vote.
 */
export default function VoteButtons({ captionId, score, myVote, signedIn, size = "sm" }: Props) {
  const [state, setState] = useState({ score, myVote });
  const [pop, setPop] = useState<"up" | "down" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const vote = (value: 1 | -1) => {
    if (!signedIn) return;
    const prev = state;
    const next = state.myVote === value ? 0 : value;
    setState({ score: state.score - state.myVote + next, myVote: next });
    setPop(value === 1 ? "up" : "down");
    setTimeout(() => setPop(null), 450);
    setError(null);

    startTransition(async () => {
      const result = await castVote(captionId, value);
      if (!result.ok) {
        setState(prev);
        setError(result.error);
      }
    });
  };

  const big = size === "lg";
  const btn = `grid place-items-center rounded-full border transition active:scale-90 disabled:opacity-40 ${
    big ? "h-11 w-11 text-xl" : "h-8 w-8 text-sm"
  }`;

  const control = (
    <div className={`flex items-center ${big ? "gap-3" : "gap-1.5"}`}>
      <button
        type="button"
        aria-label="Upvote"
        aria-pressed={state.myVote === 1}
        disabled={pending || !signedIn}
        onClick={() => vote(1)}
        className={`${btn} ${
          state.myVote === 1
            ? "border-primary bg-primary text-primary-foreground shadow"
            : "border-border bg-card hover:border-primary hover:text-primary"
        } ${pop === "up" ? "animate-pop" : ""}`}
      >
        ▲
      </button>
      <span
        className={`min-w-6 text-center font-bold tabular-nums ${big ? "text-2xl" : ""} ${
          state.score > 0 ? "text-primary" : state.score < 0 ? "text-muted" : ""
        }`}
      >
        {state.score}
      </span>
      <button
        type="button"
        aria-label="Downvote"
        aria-pressed={state.myVote === -1}
        disabled={pending || !signedIn}
        onClick={() => vote(-1)}
        className={`${btn} ${
          state.myVote === -1
            ? "border-zinc-700 bg-zinc-700 text-white shadow dark:border-zinc-300 dark:bg-zinc-300 dark:text-zinc-900"
            : "border-border bg-card hover:border-zinc-500"
        } ${pop === "down" ? "animate-pop" : ""}`}
      >
        ▼
      </button>
    </div>
  );

  if (!signedIn) {
    return (
      <Link
        href="/login?next=/gallery"
        title="Sign in to vote"
        className="group inline-flex items-center gap-2"
      >
        {control}
        <span className="text-xs text-muted group-hover:text-primary">Sign in to vote</span>
      </Link>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      {control}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
