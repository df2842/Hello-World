"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type VoteResult = { ok: true; myVote: -1 | 0 | 1 } | { ok: false; error: string };

/**
 * Casts, changes or withdraws the signed-in user's vote on a caption.
 * Clicking the same arrow twice removes the vote. Only authenticated users
 * can reach the insert; RLS enforces that a user may only write their own row.
 */
export async function castVote(captionId: string, value: 1 | -1): Promise<VoteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to vote." };

  const { data: existing } = await supabase
    .from("votes")
    .select("id, value")
    .eq("caption_id", captionId)
    .eq("user_id", user.id)
    .maybeSingle();

  let myVote: -1 | 0 | 1 = value;
  if (existing && existing.value === value) {
    const { error } = await supabase.from("votes").delete().eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    myVote = 0;
  } else {
    const { error } = await supabase
      .from("votes")
      .upsert(
        { caption_id: captionId, user_id: user.id, value },
        { onConflict: "caption_id,user_id" },
      );
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/gallery");
  revalidatePath("/gallery/[id]", "page");
  return { ok: true, myVote };
}

/** Lets an uploader remove their own image (captions and votes cascade). */
export async function deleteImage(imageId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in first." };

  const { data: image } = await supabase
    .from("images")
    .select("storage_path, user_id")
    .eq("id", imageId)
    .maybeSingle();
  if (!image || image.user_id !== user.id) return { ok: false, error: "Not your image." };

  const { error } = await supabase.from("images").delete().eq("id", imageId);
  if (error) return { ok: false, error: error.message };
  await supabase.storage.from("images").remove([image.storage_path]);

  revalidatePath("/gallery");
  return { ok: true };
}
