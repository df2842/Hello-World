"use client";

import { JOKE_STYLES, type JokeStyle } from "@/lib/joke-styles";

/** One row of chips for the kind of jokes the model should write. */
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
    <div role="radiogroup" aria-label="Joke style" className="no-scrollbar flex shrink-0 flex-wrap gap-2">
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
            className={`h-10 whitespace-nowrap rounded-xl border-2 px-3 text-sm font-bold transition disabled:opacity-50 ${
              selected
                ? "border-primary bg-primary text-primary-foreground shadow"
                : "border-foreground/15 bg-card hover:border-primary"
            }`}
          >
            <span aria-hidden>{style.emoji}</span> {style.label}
          </button>
        );
      })}
    </div>
  );
}
