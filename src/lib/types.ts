export type ImageRow = {
  id: string;
  user_id: string;
  storage_path: string;
  public_url: string;
  description: string;
  created_at: string;
};

export type CaptionRow = {
  id: string;
  image_id: string;
  user_id: string;
  text: string;
  model: string | null;
  created_at: string;
};

export type CaptionScore = {
  caption_id: string;
  score: number;
  upvotes: number;
  downvotes: number;
};

export type Vote = -1 | 0 | 1;

/** A caption with its vote totals and the current viewer's own vote. */
export type ScoredCaption = CaptionRow & {
  score: number;
  upvotes: number;
  downvotes: number;
  myVote: Vote;
};

export type ImageWithCaptions = ImageRow & {
  captions: ScoredCaption[];
};

/** A caption bundled with the picture it belongs to. */
export type CaptionWithImage = ScoredCaption & {
  image: Pick<ImageRow, "id" | "public_url" | "description" | "user_id">;
};
