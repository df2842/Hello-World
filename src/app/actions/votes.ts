"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeCaptions } from "@/lib/captions";
import { parseStyle } from "@/lib/joke-styles";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Upper bound on jokes per picture, so "more jokes" can't run forever. */
const MAX_CAPTIONS_PER_IMAGE = 16;

function refreshViews() {
  revalidatePath("/gallery");
  revalidatePath("/gallery/[id]", "page");
  revalidatePath("/rate");
  revalidatePath("/me");
  revalidatePath("/");
}

export type VoteResult =
  | { ok: true; myVote: -1 | 0 | 1 }
  | { ok: false; error: string; needsSignIn?: boolean };

/**
 * Sets the signed-in user's vote on a caption to `target`: 1 (upvote),
 * -1 (downvote) or 0 (no vote). Setting rather than toggling makes repeated
 * or out-of-order requests safe. Server actions are public endpoints, so
 * inputs are validated here; RLS additionally guarantees a user can only
 * write their own vote row.
 *
 * `quiet` skips re-rendering pages afterwards (Rate mode keeps its own state
 * and votes quickly, so a re-render per vote would only slow it down).
 */
export async function castVote(
  captionId: string,
  target: number,
  options?: { quiet?: boolean },
): Promise<VoteResult> {
  if (typeof captionId !== "string" || !UUID.test(captionId)) {
    return { ok: false, error: "Unknown caption." };
  }
  if (target !== 1 && target !== -1 && target !== 0) return { ok: false, error: "Invalid vote." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to vote.", needsSignIn: true };

  if (target === 0) {
    const { error } = await supabase.from("votes").delete().eq("caption_id", captionId).eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("votes")
      .upsert({ caption_id: captionId, user_id: user.id, value: target }, { onConflict: "caption_id,user_id" });
    if (error) {
      return {
        ok: false,
        error: error.code === "23503" ? "That joke no longer exists." : error.message,
      };
    }
  }

  if (!options?.quiet) refreshViews();
  return { ok: true, myVote: target };
}

/** Lets an uploader remove their own image (captions and votes cascade). */
export async function deleteImage(imageId: string): Promise<{ ok: boolean; error?: string }> {
  if (typeof imageId !== "string" || !UUID.test(imageId)) return { ok: false, error: "Unknown image." };

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

  refreshViews();
  return { ok: true };
}

export type MoreCaptionsResult =
  | { ok: true; added: { id: string; text: string }[]; model: string }
  | { ok: false; error: string };

/**
 * Re-runs only the second link of the prompt chain (description -> jokes) for
 * one of the user's own pictures, in a chosen style, avoiding repeats.
 */
export async function generateMoreCaptions(
  imageId: string,
  styleInput: string,
): Promise<MoreCaptionsResult> {
  if (typeof imageId !== "string" || !UUID.test(imageId)) return { ok: false, error: "Unknown image." };
  const style = parseStyle(styleInput);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in first." };

  const { data: image } = await supabase
    .from("images")
    .select("id, user_id, description, captions(text)")
    .eq("id", imageId)
    .maybeSingle();
  if (!image || image.user_id !== user.id) {
    return { ok: false, error: "You can only add jokes to your own pictures." };
  }

  const existing = ((image.captions as { text: string }[] | null) ?? []).map((c) => c.text);
  const room = MAX_CAPTIONS_PER_IMAGE - existing.length;
  if (room <= 0) {
    return { ok: false, error: `This picture already has ${MAX_CAPTIONS_PER_IMAGE} jokes. Let the votes decide!` };
  }

  try {
    const { captions, model } = await writeCaptions(image.description, {
      style,
      count: Math.min(4, room),
      avoid: existing,
      deadline: Date.now() + 40_000,
    });
    const { data: inserted, error } = await supabase
      .from("captions")
      .insert(captions.map((text) => ({ image_id: image.id, user_id: user.id, text, model })))
      .select("id, text");
    if (error) return { ok: false, error: error.message };

    refreshViews();
    return { ok: true, added: inserted ?? [], model };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not write more jokes." };
  }
}
