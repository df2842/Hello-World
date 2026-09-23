export type Joke = {
  id: number;
  setup: string;
  punchline: string;
  category: string;
  created_at: string;
};

/** Badge colors per category so the list is easy to scan. */
export const CATEGORY_STYLES: Record<string, string> = {
  programming: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
  databases:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
  ai: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
  networking:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
};

export function categoryStyle(category: string) {
  return (
    CATEGORY_STYLES[category] ??
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
  );
}
