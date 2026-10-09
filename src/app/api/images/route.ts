import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  describeImage,
  writeCaptions,
  ModelsBusyError,
  type ImageMediaType,
} from "@/lib/captions";
import { parseStyle } from "@/lib/joke-styles";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 6 * 1024 * 1024;
/** Protects the shared free AI quota from one person hammering uploads. */
const UPLOADS_PER_HOUR = 20;

const EXT: Record<ImageMediaType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Leaves headroom inside maxDuration for storage, inserts and rollback. */
const AI_BUDGET_MS = 42_000;

/**
 * Identify the real file type from its first bytes instead of trusting the
 * browser. GIF is not accepted: Gemini can't read it (the browser converts
 * GIFs to JPEG before uploading).
 */
function sniff(buf: Buffer): ImageMediaType | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP")
    return "image/webp";
  return null;
}

/**
 * Upload an image, run the prompt chain (describe -> caption), store everything.
 * Streams newline-delimited JSON progress events so the UI can show each step.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to upload." }, { status: 401 });
  }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recent } = await supabase
    .from("images")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if ((recent ?? 0) >= UPLOADS_PER_HOUR) {
    return NextResponse.json(
      { error: `You can upload ${UPLOADS_PER_HOUR} photos per hour. Take a breather and vote on some jokes!` },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }
  const file = form.get("file");
  const style = parseStyle(form.get("style"));
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 6 MB." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mediaType = sniff(buffer);
  if (!mediaType) {
    return NextResponse.json({ error: "Use a JPEG, PNG or WebP image." }, { status: 415 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      let storagePath: string | null = null;
      let imageId: string | null = null;
      const deadline = Date.now() + AI_BUDGET_MS;

      try {
        send({ step: "describing" });
        const described = await describeImage(buffer.toString("base64"), mediaType, deadline);
        send({ step: "described", description: described.description, model: described.model });

        const written = await writeCaptions(described.description, { style, deadline });
        send({ step: "captioned", captions: written.captions, model: written.model });

        send({ step: "saving" });
        storagePath = `${user.id}/${randomUUID()}.${EXT[mediaType]}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(storagePath, buffer, { contentType: mediaType, upsert: false });
        if (uploadError) {
          storagePath = null;
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("images").getPublicUrl(storagePath);

        const { data: image, error: imageError } = await supabase
          .from("images")
          .insert({
            user_id: user.id,
            storage_path: storagePath,
            public_url: publicUrl,
            description: described.description,
          })
          .select("id")
          .single();
        if (imageError) throw new Error(`Could not save image: ${imageError.message}`);
        imageId = image.id;

        const { error: captionError } = await supabase.from("captions").insert(
          written.captions.map((text) => ({
            image_id: image.id,
            user_id: user.id,
            text,
            model: written.model,
          })),
        );
        if (captionError) throw new Error(`Could not save captions: ${captionError.message}`);

        send({ step: "done", id: image.id });
      } catch (err) {
        // Roll back anything half-saved so the gallery never shows a broken entry.
        if (imageId) await supabase.from("images").delete().eq("id", imageId);
        if (storagePath) await supabase.storage.from("images").remove([storagePath]);

        const message =
          err instanceof ModelsBusyError || err instanceof Error ? err.message : "Something went wrong.";
        send({ step: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
