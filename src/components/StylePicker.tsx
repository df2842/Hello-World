"use client";

import { JOKE_STYLES, type JokeStyle } from "@/lib/joke-styles";

/** Chip selector for the kind of jokes the model should write. */
export default function StylePicker({
  value,
  onChange,
  disabled,
}: {
  value: JokeStyle;
  onChange: (style: JokeStyle) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Joke style" className="flex flex-wrap gap-2">
      {(Object.keys(JOKE_STYLES) as JokeStyle[]).map((key) => {
        const style = JOKE_STYLES[key];
        const selected = key === value;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(key)}
            className={`rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-50 ${
              selected
                ? "border-primary bg-primary text-primary-foreground shadow"
                : "border-border bg-card hover:border-primary/60"
            }`}
          >
            <span aria-hidden>{style.emoji}</span> {style.label}
          </button>
        );
      })}
    </div>
  );
}
