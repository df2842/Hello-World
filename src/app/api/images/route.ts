import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { describeImage, writeCaptions, MODEL, type ImageMediaType } from "@/lib/captions";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED: Record<string, ImageMediaType> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
};
const EXT: Record<ImageMediaType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

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

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }
  const mediaType = ALLOWED[file.type];
  if (!mediaType) {
    return NextResponse.json({ error: "Use a JPEG, PNG, WebP or GIF." }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 6 MB." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        send({ step: "describing" });
        const description = await describeImage(buffer.toString("base64"), mediaType);
        send({ step: "described", description });

        const captions = await writeCaptions(description);
        send({ step: "captioned", captions });

        send({ step: "saving" });
        const storagePath = `${user.id}/${randomUUID()}.${EXT[mediaType]}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(storagePath, buffer, { contentType: mediaType, upsert: false });
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        const {
          data: { publicUrl },
        } = supabase.storage.from("images").getPublicUrl(storagePath);

        const { data: image, error: imageError } = await supabase
          .from("images")
          .insert({ user_id: user.id, storage_path: storagePath, public_url: publicUrl, description })
          .select("id")
          .single();
        if (imageError) throw new Error(`Could not save image: ${imageError.message}`);

        const { error: captionError } = await supabase.from("captions").insert(
          captions.map((text) => ({ image_id: image.id, user_id: user.id, text, model: MODEL })),
        );
        if (captionError) throw new Error(`Could not save captions: ${captionError.message}`);

        send({ step: "done", id: image.id });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong.";
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
