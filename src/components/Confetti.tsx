"use client";

import { useEffect, useState } from "react";

const PIECES = ["🎉", "😂", "🤣", "✨", "🎊", "😆", "🔥", "💛"];

/** A short, celebratory emoji shower. Renders nothing after it finishes. */
export default function Confetti() {
  const [pieces, setPieces] = useState<
    { id: number; left: number; delay: number; emoji: string; drift: number }[]
  >([]);

  useEffect(() => {
    const made = Array.from({ length: 28 }, (_, id) => ({
      id,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      emoji: PIECES[id % PIECES.length],
      drift: (Math.random() - 0.5) * 200,
    }));
    const show = setTimeout(() => setPieces(made), 0);
    const hide = setTimeout(() => setPieces([]), 3800);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  if (pieces.length === 0) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece absolute -top-10 text-3xl"
          style={
            {
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              "--drift": `${p.drift}px`,
            } as React.CSSProperties
          }
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
