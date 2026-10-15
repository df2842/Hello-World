"use client";

import { Children, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

/** Column count (and a starting row count) for a viewport at least this big. First match wins. */
export type FitRule = { minWidth?: number; minHeight?: number; cols: number; rows: number };

/** Photo cards: up to 4 across on big screens, one on phones. */
export const CARD_RULES: FitRule[] = [
  { minWidth: 1280, cols: 4, rows: 2 },
  { minWidth: 1024, cols: 3, rows: 2 },
  { minWidth: 640, cols: 2, rows: 1 },
  { cols: 1, rows: 1 },
];

/** Compact rows (a joke + thumbnail each). */
export const ROW_RULES: FitRule[] = [
  { minWidth: 1024, cols: 2, rows: 4 },
  { cols: 1, rows: 3 },
];

const GAP_CARDS = 16; // gap-4
const GAP_ROWS = 10; // gap-2.5
const PAGER_HEIGHT = 56; // h-11 buttons + pt-3

function matchRule(rules: FitRule[]): number {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const i = rules.findIndex((r) => w >= (r.minWidth ?? 0) && h >= (r.minHeight ?? 0));
  return i === -1 ? rules.length - 1 : i;
}

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/** Picks the column rule that matches the current window. */
export function useFitRule(rules: FitRule[]): FitRule {
  const index = useSyncExternalStore(
    subscribe,
    () => matchRule(rules),
    () => Math.min(1, rules.length - 1), // server render: a typical laptop, corrected after hydration
  );
  return rules[Math.min(index, rules.length - 1)];
}

/** Big Prev / Next buttons with "2 of 5". Hidden when everything fits on one page. */
export function Pager({
  page,
  pages,
  onPage,
  label = "Page",
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
  label?: string;
}) {
  if (pages <= 1) return null;
  return (
    <nav aria-label={`${label} navigation`} className="flex shrink-0 items-center justify-center gap-3 pt-3">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onPage(page - 1)}
        disabled={page === 0}
        aria-label="Previous page"
      >
        ← Prev
      </button>
      <span className="min-w-20 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {page + 1} of {pages}
      </span>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onPage(page + 1)}
        disabled={page >= pages - 1}
        aria-label="Next page"
      >
        Next →
      </button>
    </nav>
  );
}

/**
 * Lays its children out in a grid that fits the space it is given, and pages
 * through the rest instead of scrolling. Columns come from the viewport
 * width; the number of rows is measured from the real available height, so
 * nothing ever spills under the pager or off the screen.
 *
 * - Cards (default): each row is at least `minItemHeight` tall and rows
 *   stretch to fill the height.
 * - Rows (`rowHeight` set): every row is exactly that tall.
 *
 * ← / → change pages when no text field has focus.
 */
export default function FitGrid({
  children,
  rules = CARD_RULES,
  label,
  className = "",
  minItemHeight = 240,
  rowHeight,
}: {
  children: ReactNode;
  rules?: FitRule[];
  label: string;
  className?: string;
  minItemHeight?: number;
  rowHeight?: number;
}) {
  const items = Children.toArray(children);
  const rule = useFitRule(rules);
  const cols = rule.cols;
  const fixedRows = rowHeight !== undefined;
  const gap = fixedRows ? GAP_ROWS : GAP_CARDS;
  const unit = fixedRows ? rowHeight : minItemHeight;

  // Measure the height we actually have (updates on resize/rotation).
  const boxRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    observer.observe(el);
    // First measurement right away too: ResizeObserver only reports on a
    // rendered frame, which can be late (e.g. a tab opened in the background).
    const first = setTimeout(() => setHeight(el.getBoundingClientRect().height), 0);
    return () => {
      clearTimeout(first);
      observer.disconnect();
    };
  }, []);

  const fit = (h: number) => Math.max(1, Math.floor((h + gap) / (unit + gap)));
  let rowsPerPage: number;
  if (height === null) {
    rowsPerPage = rule.rows; // before the first measurement
  } else {
    const withoutPager = fit(height);
    rowsPerPage = items.length <= cols * withoutPager ? withoutPager : fit(height - PAGER_HEIGHT);
  }

  const perPage = cols * rowsPerPage;
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const [requested, setPage] = useState(0);
  const page = Math.min(requested, pages - 1);
  const shown = items.slice(page * perPage, page * perPage + perPage);
  // With only a few cards, use just as many rows as needed so they fill the screen.
  const rows = !fixedRows && pages === 1 ? Math.max(1, Math.ceil(items.length / cols)) : rowsPerPage;

  useEffect(() => {
    if (pages <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      if (document.querySelector("dialog[open]")) return;
      if (e.key === "ArrowRight") setPage((p) => Math.min(Math.min(p, pages - 1) + 1, pages - 1));
      else if (e.key === "ArrowLeft") setPage((p) => Math.max(Math.min(p, pages - 1) - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages]);

  return (
    <div ref={boxRef} className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <ul
        aria-label={label}
        className={`grid min-h-0 flex-1 ${fixedRows ? "content-start gap-2.5" : "gap-4"}`}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: fixedRows ? undefined : `repeat(${rows}, minmax(0, 1fr))`,
          gridAutoRows: fixedRows ? `${rowHeight}px` : undefined,
        }}
      >
        {shown.map((child, i) => (
          <li key={(child as { key?: string }).key ?? i} className="flex min-h-0 min-w-0">
            {child}
          </li>
        ))}
      </ul>
      <Pager page={page} pages={pages} onPage={setPage} label={label} />
    </div>
  );
}
