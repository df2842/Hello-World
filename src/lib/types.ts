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

/** A caption with its vote totals and the current viewer's own vote. */
export type ScoredCaption = CaptionRow & {
  score: number;
  upvotes: number;
  downvotes: number;
  myVote: -1 | 0 | 1;
};

export type ImageWithCaptions = ImageRow & {
  captions: ScoredCaption[];
};
