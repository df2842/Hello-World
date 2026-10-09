import { createClient } from "@/lib/supabase/server";
import type {
  CaptionRow,
  CaptionScore,
  CaptionWithImage,
  ImageRow,
  ImageWithCaptions,
  ScoredCaption,
  Vote,
} from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type ImageRef = CaptionWithImage["image"];

/** PostgREST puts `.in()` filters in the URL, so long id lists are split up. */
const CHUNK = 80;

async function inChunks<T>(ids: string[], run: (chunk: string[]) => PromiseLike<{ data: T[] | null }>) {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data } = await run(ids.slice(i, i + CHUNK));
    if (data) out.push(...data);
  }
  return out;
}

async function currentUserId(supabase: Supabase): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Attaches vote totals and the viewer's own vote to each caption. */
async function scoreCaptions(
  supabase: Supabase,
  captions: CaptionRow[],
  userId: string | null,
): Promise<ScoredCaption[]> {
  if (captions.length === 0) return [];
  const ids = captions.map((c) => c.id);

  const [scores, mine] = await Promise.all([
    inChunks<CaptionScore>(ids, (chunk) =>
      supabase.from("caption_scores").select("*").in("caption_id", chunk),
    ),
    userId
      ? inChunks<{ caption_id: string; value: number }>(ids, (chunk) =>
          supabase.from("votes").select("caption_id, value").eq("user_id", userId).in("caption_id", chunk),
        )
      : Promise.resolve([]),
  ]);

  const scoreById = new Map(scores.map((s) => [s.caption_id, s]));
  const myVoteById = new Map(mine.map((v) => [v.caption_id, v.value as Vote]));

  return captions.map((c) => {
    const s = scoreById.get(c.id);
    return {
      ...c,
      score: s?.score ?? 0,
      upvotes: s?.upvotes ?? 0,
      downvotes: s?.downvotes ?? 0,
      myVote: myVoteById.get(c.id) ?? 0,
    };
  });
}

const byScore = (a: ScoredCaption, b: ScoredCaption) =>
  b.score - a.score || b.upvotes - a.upvotes || a.created_at.localeCompare(b.created_at);

function groupByImage(rows: (ImageRow & { captions: CaptionRow[] })[], scored: ScoredCaption[]) {
  const byImage = new Map<string, ScoredCaption[]>();
  for (const c of scored) {
    const list = byImage.get(c.image_id) ?? [];
    list.push(c);
    byImage.set(c.image_id, list);
  }
  return rows.map((r) => ({ ...r, captions: (byImage.get(r.id) ?? []).sort(byScore) }));
}

export async function getGallery(): Promise<{
  images: ImageWithCaptions[];
  viewerId: string | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const viewerId = await currentUserId(supabase);

  const { data, error } = await supabase
    .from("images")
    .select("*, captions(*)")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) return { images: [], viewerId, error: error.message };

  const rows = (data as (ImageRow & { captions: CaptionRow[] })[]) ?? [];
  const scored = await scoreCaptions(supabase, rows.flatMap((r) => r.captions), viewerId);
  return { images: groupByImage(rows, scored), viewerId, error: null };
}

export async function getImage(id: string): Promise<{
  image: ImageWithCaptions | null;
  viewerId: string | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const viewerId = await currentUserId(supabase);

  if (!/^[0-9a-f-]{36}$/i.test(id)) return { image: null, viewerId, error: null };

  const { data, error } = await supabase.from("images").select("*, captions(*)").eq("id", id).maybeSingle();
  if (error) return { image: null, viewerId, error: error.message };
  if (!data) return { image: null, viewerId, error: null };

  const row = data as ImageRow & { captions: CaptionRow[] };
  const captions = await scoreCaptions(supabase, row.captions, viewerId);
  return { image: { ...row, captions: captions.sort(byScore) }, viewerId, error: null };
}

/** Top captions across the whole gallery, for the hall of fame. */
export async function getLeaderboard(limit = 3): Promise<CaptionWithImage[]> {
  const supabase = await createClient();
  const { data: scores } = await supabase
    .from("caption_scores")
    .select("*")
    .gt("score", 0)
    .order("score", { ascending: false })
    .order("upvotes", { ascending: false })
    .limit(limit);
  const top = (scores as CaptionScore[] | null) ?? [];
  if (top.length === 0) return [];

  const { data: captions } = await supabase
    .from("captions")
    .select("*, images(id, public_url, description, user_id)")
    .in(
      "id",
      top.map((s) => s.caption_id),
    );
  const byId = new Map(
    ((captions as (CaptionRow & { images: ImageRef })[] | null) ?? []).map((c) => [c.id, c]),
  );

  return top.flatMap((s) => {
    const c = byId.get(s.caption_id);
    if (!c) return [];
    const { images, ...caption } = c;
    return [{ ...caption, ...s, myVote: 0 as Vote, image: images }];
  });
}

/**
 * Jokes for Rate mode. Signed-in users get only jokes they haven't voted on
 * yet; visitors get a read-only preview of recent jokes.
 */
export async function getRateQueue(limit = 40): Promise<{
  queue: CaptionWithImage[];
  viewerId: string | null;
  ratedCount: number;
}> {
  const supabase = await createClient();
  const viewerId = await currentUserId(supabase);

  const [{ data }, { data: myVotes }] = await Promise.all([
    supabase
      .from("captions")
      .select("*, images(id, public_url, description, user_id)")
      .order("created_at", { ascending: false })
      .limit(400),
    viewerId
      ? supabase.from("votes").select("caption_id").eq("user_id", viewerId).limit(5000)
      : Promise.resolve({ data: [] as { caption_id: string }[] }),
  ]);

  const voted = new Set((myVotes ?? []).map((v) => v.caption_id));
  const rows = ((data as (CaptionRow & { images: ImageRef | null })[] | null) ?? []).filter(
    (c) => c.images && !voted.has(c.id),
  );

  // Keep each picture's jokes together, newest pictures first.
  const order = new Map<string, number>();
  rows.forEach((c, i) => {
    if (!order.has(c.image_id)) order.set(c.image_id, i);
  });
  rows.sort(
    (a, b) => order.get(a.image_id)! - order.get(b.image_id)! || a.created_at.localeCompare(b.created_at),
  );

  const picked = rows.slice(0, limit);
  const scored = await scoreCaptions(supabase, picked, viewerId);
  const queue = scored.map((c, i) => ({ ...c, image: picked[i].images! }));
  return { queue, viewerId, ratedCount: voted.size };
}

export type MyStats = {
  pictures: number;
  jokes: number;
  votesReceived: number;
  netScore: number;
  votesCast: number;
  best: CaptionWithImage | null;
};

/** Everything for the "My Jokes" page: the viewer's pictures, jokes and votes. */
export async function getMyJokes(): Promise<{
  viewerId: string | null;
  images: ImageWithCaptions[];
  allJokes: CaptionWithImage[];
  myVotes: CaptionWithImage[];
  stats: MyStats;
  error: string | null;
}> {
  const supabase = await createClient();
  const viewerId = await currentUserId(supabase);
  const empty: MyStats = { pictures: 0, jokes: 0, votesReceived: 0, netScore: 0, votesCast: 0, best: null };
  if (!viewerId) return { viewerId, images: [], allJokes: [], myVotes: [], stats: empty, error: null };

  const [{ data, error }, { data: votes }] = await Promise.all([
    supabase
      .from("images")
      .select("*, captions(*)")
      .eq("user_id", viewerId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("votes")
      .select("value, created_at, captions(*, images(id, public_url, description, user_id))")
      .eq("user_id", viewerId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (error) return { viewerId, images: [], allJokes: [], myVotes: [], stats: empty, error: error.message };

  const rows = (data as (ImageRow & { captions: CaptionRow[] })[]) ?? [];
  const scored = await scoreCaptions(supabase, rows.flatMap((r) => r.captions), viewerId);
  const images = groupByImage(rows, scored);

  const imageRef = new Map<string, ImageRef>(
    rows.map((r) => [r.id, { id: r.id, public_url: r.public_url, description: r.description, user_id: r.user_id }]),
  );
  const allJokes = scored
    .map((c) => ({ ...c, image: imageRef.get(c.image_id)! }))
    .sort(byScore);

  type VoteRow = { value: number; captions: (CaptionRow & { images: ImageRef | null }) | null };
  const voteRows = ((votes as VoteRow[] | null) ?? []).filter((v) => v.captions?.images);
  const votedCaptions = voteRows.map((v) => v.captions!);
  const votedScored = await scoreCaptions(supabase, votedCaptions, viewerId);
  const myVotes = votedScored.map((c, i) => ({ ...c, image: votedCaptions[i].images! }));

  const stats: MyStats = {
    pictures: images.length,
    jokes: scored.length,
    votesReceived: scored.reduce((n, c) => n + c.upvotes + c.downvotes, 0),
    netScore: scored.reduce((n, c) => n + c.score, 0),
    votesCast: voteRows.length,
    best: allJokes.find((c) => c.score > 0) ?? null,
  };

  return { viewerId, images, allJokes, myVotes, stats, error: null };
}

/** Small public counters for the home page. */
export async function getSiteStats(): Promise<{ pictures: number; jokes: number; votes: number }> {
  const supabase = await createClient();
  const [images, captions, scores] = await Promise.all([
    supabase.from("images").select("id", { count: "exact", head: true }),
    supabase.from("captions").select("id", { count: "exact", head: true }),
    supabase.from("caption_scores").select("upvotes, downvotes").limit(5000),
  ]);
  const votes = ((scores.data as { upvotes: number; downvotes: number }[] | null) ?? []).reduce(
    (n, s) => n + s.upvotes + s.downvotes,
    0,
  );
  return { pictures: images.count ?? 0, jokes: captions.count ?? 0, votes };
}
