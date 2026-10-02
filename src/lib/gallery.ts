import { createClient } from "@/lib/supabase/server";
import type {
  CaptionRow,
  CaptionScore,
  ImageRow,
  ImageWithCaptions,
  ScoredCaption,
} from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Attaches vote totals and the viewer's own vote to each caption. */
async function scoreCaptions(
  supabase: Supabase,
  captions: CaptionRow[],
  userId: string | null,
): Promise<ScoredCaption[]> {
  if (captions.length === 0) return [];
  const ids = captions.map((c) => c.id);

  const [{ data: scores }, { data: mine }] = await Promise.all([
    supabase.from("caption_scores").select("*").in("caption_id", ids),
    userId
      ? supabase.from("votes").select("caption_id, value").in("caption_id", ids)
      : Promise.resolve({ data: [] as { caption_id: string; value: number }[] }),
  ]);

  const scoreById = new Map<string, CaptionScore>();
  for (const s of (scores as CaptionScore[] | null) ?? []) scoreById.set(s.caption_id, s);
  const myVoteById = new Map<string, number>();
  for (const v of mine ?? []) myVoteById.set(v.caption_id, v.value);

  return captions
    .map((c) => {
      const s = scoreById.get(c.id);
      return {
        ...c,
        score: s?.score ?? 0,
        upvotes: s?.upvotes ?? 0,
        downvotes: s?.downvotes ?? 0,
        myVote: (myVoteById.get(c.id) ?? 0) as -1 | 0 | 1,
      };
    })
    .sort((a, b) => b.score - a.score || a.created_at.localeCompare(b.created_at));
}

export async function getGallery(): Promise<{
  images: ImageWithCaptions[];
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("images")
    .select("*, captions(*)")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) return { images: [], error: error.message };

  const rows = (data as (ImageRow & { captions: CaptionRow[] })[]) ?? [];
  const allCaptions = rows.flatMap((r) => r.captions);
  const scored = await scoreCaptions(supabase, allCaptions, user?.id ?? null);
  const byImage = new Map<string, ScoredCaption[]>();
  for (const c of scored) {
    const list = byImage.get(c.image_id) ?? [];
    list.push(c);
    byImage.set(c.image_id, list);
  }

  return {
    images: rows.map((r) => ({ ...r, captions: byImage.get(r.id) ?? [] })),
    error: null,
  };
}

export async function getImage(id: string): Promise<{
  image: ImageWithCaptions | null;
  viewerId: string | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("images")
    .select("*, captions(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) return { image: null, viewerId: user?.id ?? null, error: error.message };
  if (!data) return { image: null, viewerId: user?.id ?? null, error: null };

  const row = data as ImageRow & { captions: CaptionRow[] };
  const captions = await scoreCaptions(supabase, row.captions, user?.id ?? null);
  return { image: { ...row, captions }, viewerId: user?.id ?? null, error: null };
}

/** Top captions across the whole gallery, for the leaderboard. */
export async function getLeaderboard(limit = 3): Promise<
  (ScoredCaption & { image: Pick<ImageRow, "id" | "public_url"> })[]
> {
  const supabase = await createClient();
  const { data: scores } = await supabase
    .from("caption_scores")
    .select("*")
    .gt("score", 0)
    .order("score", { ascending: false })
    .limit(limit);
  const top = (scores as CaptionScore[] | null) ?? [];
  if (top.length === 0) return [];

  const { data: captions } = await supabase
    .from("captions")
    .select("*, images(id, public_url)")
    .in(
      "id",
      top.map((s) => s.caption_id),
    );
  const byId = new Map(
    ((captions as (CaptionRow & { images: Pick<ImageRow, "id" | "public_url"> })[] | null) ?? []).map(
      (c) => [c.id, c],
    ),
  );

  return top.flatMap((s) => {
    const c = byId.get(s.caption_id);
    if (!c) return [];
    const { images, ...caption } = c;
    return [{ ...caption, ...s, myVote: 0 as const, image: images }];
  });
}
